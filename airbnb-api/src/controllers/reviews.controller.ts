import type { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma.js";
import { createReviewSchema } from "../validators/review.validator.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import { getCache, setCache, deleteCache, deleteCacheByPattern } from "../config/cache.js";

const parseId = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

/**
 * POST /listings/:id/reviews - Add a review to a listing
 */
export const createReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const listingId = parseId(req.params.id);

    const parsed = createReviewSchema.parse(req.body);
    const { userId, rating, comment } = parsed;

    // Validate rating
    if (rating < 1 || rating > 5) {
      res.status(400).json({ message: "Rating must be between 1 and 5" });
      return;
    }

    // Check if listing exists
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    const review = await prisma.review.create({
      data: {
        userId,
        listingId,
        rating,
        comment,
      },
      include: {
        user: {
          select: { name: true, avatar: true },
        },
      },
    });

    // Clear cache for this listing's reviews
    deleteCache(`reviews:listing:${listingId}`);
    deleteCacheByPattern("stats:listings");

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /listings/:id/reviews - Get all reviews for a listing (paginated)
 */
export const getListingReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const listingId = parseId(req.params.id);
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

    // Try to get from cache
    const cacheKey = `reviews:listing:${listingId}:page:${page}:limit:${limit}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // Check if listing exists
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    // Fetch reviews and count in parallel
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { listingId },
        include: {
          user: {
            select: { name: true, avatar: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.count({ where: { listingId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const response = {
      data: reviews,
      meta: { total, page, limit, totalPages },
    };

    // Cache the response for 30 seconds
    setCache(cacheKey, response, 30);

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /reviews/:id - Delete a review
 */
export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      res.status(404).json({ message: "Review not found" });
      return;
    }

    await prisma.review.delete({ where: { id } });

    // Clear cache for this listing's reviews
    deleteCache(`reviews:listing:${review.listingId}`);
    deleteCacheByPattern("stats:listings");

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    next(error);
  }
};
