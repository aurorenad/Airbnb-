import type { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import prisma from "../config/prisma.js";
import { createUserSchema, updateUserSchema } from "../validators/users.validator.js";
import bcrypt from "bcrypt";
import { sendEmail } from "../config/email.js";
import { welcomeEmail } from "../templates/emails.js";

const parseId = (value: string | string[] | undefined): number =>
  Number.parseInt(Array.isArray(value) ? value[0] ?? "" : value ?? "", 10);

export const getAllUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try{
    const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { listings: true },
      },
    },
  });

  res.json(users);
  }catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ message: "Invalid user id" });
    return;
  }

  const roleOnly = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });

  if (!roleOnly) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (roleOnly.role === Role.HOST) {
    const hostWithListings = await prisma.user.findUnique({
      where: { id },
      include: {
        listings: {
          include: {
            _count: { select: { bookings: true } },
          },
        },
      },
    });

    res.json(hostWithListings);
    return;
  }

  const guestWithBookings = await prisma.user.findUnique({
    where: { id },
    include: {
      bookings: {
        include: {
          listing: {
            select: { title: true, location: true },
          },
        },
      },
    },
  });

  res.json(guestWithBookings);
  } catch (error) {
    next(error);
  }
};

export const getUserListings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ message: "Invalid user id" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const listings = await prisma.listing.findMany({ where: { hostId: id } });
  res.json(listings);
  } catch (error) {
    next(error);
  }
};

export const getUserBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ message: "Invalid user id" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const bookings = await prisma.booking.findMany({
    where: { guestId: id },
    include: { listing: true },
  });
  res.json(bookings);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createUserSchema.parse(req.body);
    const { name, email, username, phone, role, password } = parsed;
    const avatar = req.body.avatar as string | undefined;
    const bio = req.body.bio as string | undefined;

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    res.status(409).json({ message: "Email already exists" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      username,
      phone,
      role: role as Role,
      password: hashedPassword,
      avatar: avatar ?? null,
      bio: bio ?? null,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _password, resetToken, resetTokenExpiry, ...safeUser } = user;
  res.status(201).json(safeUser);

  // Send welcome email (non-blocking)
  sendEmail(user.email, "Welcome to Airbnb!", welcomeEmail(user.name, user.role))
    .catch((err) => console.error("Failed to send welcome email:", err));
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ message: "Invalid user id" });
    return;
  }

  const current = await prisma.user.findFirst({ where: { id } });
  if (!current) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const parsed = updateUserSchema.parse(req.body);
  const payload: Record<string, unknown> = { ...parsed };
  if (typeof req.body.avatar === "string") payload.avatar = req.body.avatar;
  if (typeof req.body.bio === "string") payload.bio = req.body.bio;

  const user = await prisma.user.update({
    where: { id },
    data: payload,
  });

  res.json(user);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ message: "Invalid user id" });
    return;
  }

  const current = await prisma.user.findFirst({ where: { id } });
  if (!current) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).send();
  } catch (error) {
    next(error);
  }
};
