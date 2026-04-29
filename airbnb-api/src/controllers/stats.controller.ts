import type { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma.js";
import { getCache, setCache, deleteCacheByPattern } from "../config/cache.js";

/**
 * GET /listings/stats - Get statistics about listings
 */
export const getListingsStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Try to get from cache
    const cacheKey = "stats:listings";
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // Fetch all stats in parallel
    const [totalCount, avgPrice, byLocation, byType] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.aggregate({
        _avg: { pricePerNight: true },
      }),
      prisma.listing.groupBy({
        by: ["location"],
        _count: { location: true },
      }),
      prisma.listing.groupBy({
        by: ["type"],
        _count: { type: true },
      }),
    ]);

    const response = {
      totalListings: totalCount,
      averagePrice: avgPrice._avg.pricePerNight || 0,
      byLocation,
      byType,
    };

    // Cache the response for 5 minutes
    setCache(cacheKey, response, 300);

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /users/stats - Get statistics about users
 */
export const getUsersStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Try to get from cache
    const cacheKey = "stats:users";
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // Fetch all stats in parallel
    const [totalCount, byRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ["role"],
        _count: { role: true },
      }),
    ]);

    const response = {
      totalUsers: totalCount,
      byRole,
    };

    // Cache the response for 5 minutes
    setCache(cacheKey, response, 300);

    res.json(response);
  } catch (error) {
    next(error);
  }
};
