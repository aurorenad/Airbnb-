import type { NextFunction, Request, Response } from "express";
import { BookingStatus } from "@prisma/client";
import prisma from "../config/prisma.js";
import { createBookingSchema } from "../validators/bookings.validator.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import { sendEmail } from "../config/email.js";
import { bookingConfirmationEmail, bookingCancellationEmail } from "../templates/emails.js";

const parseId = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export const getAllBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pageRaw = req.query.page?.toString() ?? "1";
    const limitRaw = req.query.limit?.toString() ?? "10";

    const page = Number.parseInt(pageRaw, 10);
    const limit = Number.parseInt(limitRaw, 10);

    if (
      !Number.isInteger(page) ||
      page <= 0 ||
      !Number.isInteger(limit) ||
      limit <= 0
    ) {
      res.status(400).json({ message: "page and limit must be positive integers" });
      return;
    }

    // Fetch bookings and count in parallel
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        include: {
          guest: {
            select: { name: true },
          },
          listing: {
            select: { title: true, location: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: bookings,
      meta: { total, page, limit, totalPages },
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ message: "Invalid booking id" });
    return;
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      listing: {
        include: {
          host: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!booking) {
    res.status(404).json({ message: "Booking not found" });
    return;
  }

  res.json(booking);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /users/:id/bookings - Get all bookings for a user (paginated)
 */
export const getUserBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseId(req.params.id);
    const pageRaw = req.query.page?.toString() ?? "1";
    const limitRaw = req.query.limit?.toString() ?? "10";

    const page = Number.parseInt(pageRaw, 10);
    const limit = Number.parseInt(limitRaw, 10);

    if (
      !Number.isInteger(page) ||
      page <= 0 ||
      !Number.isInteger(limit) ||
      limit <= 0
    ) {
      res.status(400).json({ message: "page and limit must be positive integers" });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Fetch bookings and count in parallel
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { guestId: userId },
        include: {
          listing: {
            select: { id: true, title: true, location: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.count({ where: { guestId: userId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: bookings,
      meta: { total, page, limit, totalPages },
    });
  } catch (error) {
    next(error);
  }
};

export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createBookingSchema.parse(req.body);
    const { userId, listingId, checkIn, checkOut, guests } = parsed;

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    res.status(404).json({ message: "Listing not found" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  const conflict = await prisma.booking.findFirst({
    where: {
      listingId,
      status: BookingStatus.CONFIRMED,
      checkIn: { lt: checkOutDate },
      checkOut: { gt: checkInDate },
    },
  });
  if (conflict) {
    res.status(409).json({ message: "Booking conflict for these dates" });
    return;
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const numberOfDays = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / millisecondsPerDay);
  const totalPrice = numberOfDays * listing.pricePerNight;

  const booking = await prisma.booking.create({
    data: {
      guestId: userId,
      listingId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      totalPrice,
      status: BookingStatus.PENDING,
    },
    include: {
      guest: {
        select: { name: true, email: true },
      },
      listing: {
        select: { title: true, location: true },
      },
    },
  });

  res.status(201).json(booking);

  // Send confirmation email (non-blocking)
  sendEmail(
    user.email,
    "Booking Confirmation",
    bookingConfirmationEmail(
      user.name,
      listing.title,
      listing.location,
      checkInDate.toDateString(),
      checkOutDate.toDateString(),
      totalPrice
    )
  ).catch((err) => console.error("Failed to send booking confirmation email:", err));
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ message: "Invalid booking id" });
    return;
  }

  const status = req.body.status?.toString()?.toUpperCase();
  if (!Object.values(BookingStatus).includes(status as BookingStatus)) {
    res.status(400).json({ message: "Invalid booking status" });
    return;
  }

  const existing = await prisma.booking.findFirst({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "Booking not found" });
    return;
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: {
      status: status as BookingStatus,
    },
  });

  res.json(booking);
  } catch (error) {
    next(error);
  }
};

export const deleteBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ message: "Invalid booking id" });
    return;
  }

  const existing = await prisma.booking.findFirst({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "Booking not found" });
    return;
  }

  if (!req.userId) {
    res.status(401).json({ message: "Missing or invalid token" });
    return;
  }
  if (existing.guestId !== req.userId && req.role !== "ADMIN") {
    res.status(403).json({ message: "You can only cancel your own bookings" });
    return;
  }
  if (existing.status === BookingStatus.CANCELLED) {
    res.status(400).json({ message: "Booking is already cancelled" });
    return;
  }

  const cancelled = await prisma.booking.update({
    where: { id },
    data: { status: BookingStatus.CANCELLED },
  });

  res.status(200).json({ message: "Booking cancelled successfully" });

  // Send cancellation email (non-blocking)
  const bookingWithDetails = await prisma.booking.findUnique({
    where: { id },
    include: {
      guest: { select: { email: true, name: true } },
      listing: { select: { title: true } },
    },
  });

  if (bookingWithDetails) {
    sendEmail(
      bookingWithDetails.guest.email,
      "Booking Cancelled",
      bookingCancellationEmail(
        bookingWithDetails.guest.name,
        bookingWithDetails.listing.title,
        bookingWithDetails.checkIn.toDateString(),
        bookingWithDetails.checkOut.toDateString()
      )
    ).catch((err) => console.error("Failed to send booking cancellation email:", err));
  }
}
  catch (error) {
    next(error);
  }
};
