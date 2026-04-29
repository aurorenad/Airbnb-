import type { NextFunction, Request, Response } from "express";
import { ListingType } from "@prisma/client";
import prisma from "../config/prisma.js";
import { createListingSchema, updateListingSchema } from "../validators/listing.validator.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";

const parseId = (value: string | string[] | undefined): number =>
  Number.parseInt(Array.isArray(value) ? value[0] ?? "" : value ?? "", 10);

export const getAllListings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try{
    const location = req.query.location?.toString();
    const type = req.query.type?.toString().toUpperCase();
    const maxPriceRaw = req.query.maxPrice?.toString();
    const pageRaw = req.query.page?.toString() ?? "1";
    const limitRaw = req.query.limit?.toString() ?? "10";
    const sortByRaw = req.query.sortBy?.toString() ?? "createdAt";
    const orderRaw = req.query.order?.toString().toLowerCase() ?? "desc";

    const page = Number.parseInt(pageRaw, 10);
    const limit = Number.parseInt(limitRaw, 10);
    if (!Number.isInteger(page) || page <= 0 || !Number.isInteger(limit) || limit <= 0) {
      res.status(400).json({ message: "page and limit must be positive integers" });
      return;
    }

    const maxPrice = maxPriceRaw ? Number.parseFloat(maxPriceRaw) : undefined;
    if (maxPriceRaw && Number.isNaN(maxPrice)) {
      res.status(400).json({ message: "maxPrice must be a number" });
      return;
    }

    if (type && !Object.values(ListingType).includes(type as ListingType)) {
      res.status(400).json({ message: "Invalid listing type" });
      return;
    }

    const allowedSortBy = new Set(["pricePerNight", "createdAt", "rating"]);
     if (!allowedSortBy.has(sortByRaw)) {
       res.status(400).json({ message: "Invalid sortBy field" });
       return;
     }

    if (orderRaw !== "asc" && orderRaw !== "desc") {
     res.status(400).json({ message: "order must be asc or desc" });
     return;
    }

    const whereClause: Record<string, unknown> = {};
     if (location) {
      whereClause.location = { contains: location, mode: "insensitive" };
     }
     if (type) {
      whereClause.type = type as ListingType;
     }
     if (typeof maxPrice === "number") {
      whereClause.pricePerNight = { lte: maxPrice };
    }

    const listings = await prisma.listing.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        pricePerNight: true,
        guests: true,
        type: true,
        amenities: true,
        rating: true,
        createdAt: true,
        updatedAt: true,
        hostId: true,
        host: {
          select: {
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { [sortByRaw]: orderRaw },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json(listings);
  }
  catch(error){
    next(error);
  }
};

export const getListingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try{
      const id = parseId(req.params.id);
      if (Number.isNaN(id)) {
        res.status(400).json({ message: "Invalid listing id" });
        return;
      }

      const listing = await prisma.listing.findUnique({
        where: { id },
        include: {
          host: true,
          bookings: {
            include: {
              guest: {
                select: { name: true, avatar: true },
              },
            },
          },
        },
      });

      if (!listing) {
        res.status(404).json({ message: "Listing not found" });
        return;
     }

    res.json(listing);
  }catch(error){
    next(error);
  }
};

export const createListing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try{
    const parsed = createListingSchema.parse(req.body);
    const { title, description, location, pricePerNight, guests, type, amenities, rating } = parsed;

  if (!req.userId) {
    res.status(401).json({ message: "Missing or invalid token" });
    return;
  }

  const listing = await prisma.listing.create({
    data: {
      title,
      description,
      location,
      pricePerNight,
      guests,
      type: type as ListingType,
      amenities,
      rating: typeof rating === "number" ? rating : null,
      hostId: req.userId,
    },
  });

  res.status(201).json(listing);
  }catch(error){
      next(error);
  }
};

export const updateListing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ message: "Invalid listing id" });
    return;
  }

  const current = await prisma.listing.findFirst({ where: { id } });
  if (!current) {
    res.status(404).json({ message: "Listing not found" });
    return;
  }

  if (!req.userId) {
    res.status(401).json({ message: "Missing or invalid token" });
    return;
  }
  if (current.hostId !== req.userId && req.role !== "ADMIN") {
    res.status(403).json({ message: "You can only edit your own listings" });
    return;
  }

  const parsed = updateListingSchema.parse(req.body);
  const payload = {
    ...parsed,
    rating: typeof parsed.rating === "number" ? parsed.rating : undefined,
  } as Record<string, unknown>;

  const listing = await prisma.listing.update({
    where: { id },
    data: payload,
  });

  res.json(listing);
  } catch (error) {
    next(error);
  }
};

export const deleteListing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try{
    const id = parseId(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ message: "Invalid listing id" });
    return;
  }

  const current = await prisma.listing.findFirst({ where: { id } });
  if (!current) {
    res.status(404).json({ message: "Listing not found" });
    return;
  }

  if (!req.userId) {
    res.status(401).json({ message: "Missing or invalid token" });
    return;
  }
  if (current.hostId !== req.userId && req.role !== "ADMIN") {
    res.status(403).json({ message: "You can only delete your own listings" });
    return;
  }

  await prisma.listing.delete({ where: { id } });
  res.status(204).send();
  }catch(error){
    next(error);
  }
};
