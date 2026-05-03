import type { Request, Response, NextFunction } from "express";
import { model, strictModel } from "../config/ai.js";
import prisma from "../config/prisma.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { getCache, setCache } from "../config/cache.js";

const parseId = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

// Part 1: Smart Listing Search with Pagination
export const aiSearch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ message: "Search query is required" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const systemPrompt = `
      Extract listing filters from the user query. Return ONLY JSON.
      Fields: location (string), type (APARTMENT, HOUSE, VILLA, ROOM), maxPrice (number), guests (number).
      If a field is not mentioned, use null.
      Example: "apartment in Kigali under $100 for 2 guests"
      Response: {"location": "Kigali", "type": "APARTMENT", "maxPrice": 100, "guests": 2}
    `;

    const aiResponse = await strictModel.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(query),
    ]);

    let filters;
    try {
      filters = JSON.parse(aiResponse.content as string);
    } catch (e) {
      res.status(500).json({ message: "AI returned invalid JSON" });
      return;
    }

    // If no filters extracted, return 400
    const hasFilters = Object.values(filters).some(v => v !== null);
    if (!hasFilters) {
      res.status(400).json({ message: "Could not extract any filters from your query, please be more specific" });
      return;
    }

    const where: any = {};
    if (filters.location) where.location = { contains: filters.location, mode: 'insensitive' };
    if (filters.type) where.type = filters.type;
    if (filters.maxPrice) where.pricePerNight = { lte: filters.maxPrice };
    if (filters.guests) where.guests = { gte: filters.guests };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          host: {
            select: { name: true, email: true }
          }
        }
      }),
      prisma.listing.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      filters,
      data: listings,
      meta: { total, page, limit, totalPages }
    });
  } catch (error: any) {
    if (error?.status === 429) {
      res.status(429).json({ message: "AI service is busy, please try again in a moment" });
      return;
    }
    if (error?.status === 401) {
      res.status(500).json({ message: "AI service configuration error" });
      return;
    }
    next(error);
  }
};

// Part 2: Listing Description Generator with Tone Control
export const generateListingDescription = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const { tone = "professional" } = req.body;

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    let toneInstruction = "";
    switch (tone) {
      case "casual":
        toneInstruction = "friendly, relaxed, and conversational";
        break;
      case "luxury":
        toneInstruction = "elegant, premium, and aspirational";
        break;
      default:
        toneInstruction = "formal, clear, and business-like";
    }

    const systemPrompt = `You are a professional real estate copywriter. Generate a ${toneInstruction} description for a listing.`;
    const userPrompt = `
      Listing Details:
      Title: ${listing.title}
      Location: ${listing.location}
      Type: ${listing.type}
      Price: $${listing.pricePerNight}/night
      Guests: ${listing.guests}
      Amenities: ${listing.amenities.join(", ")}
    `;

    const aiResponse = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    const description = aiResponse.content as string;

    const updatedListing = await prisma.listing.update({
      where: { id },
      data: { description }
    });

    res.json({
      description,
      listing: updatedListing
    });
  } catch (error: any) {
    if (error?.status === 429) {
      res.status(429).json({ message: "AI service is busy, please try again in a moment" });
      return;
    }
    next(error);
  }
};

// Part 3: Guest Support Chatbot with Listing Context
const chatHistories = new Map<string, any[]>();

export const aiChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId, message, listingId } = req.body;
    if (!sessionId || !message) {
      res.status(400).json({ message: "sessionId and message are required" });
      return;
    }

    let history = chatHistories.get(sessionId) || [];
    
    let systemPrompt = "You are a helpful guest support assistant for an Airbnb-like platform.";
    
    if (listingId) {
      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (listing) {
        systemPrompt = `
          You are a helpful guest support assistant for an Airbnb-like platform.
          You are currently helping a guest with questions about this specific listing:

          Title: ${listing.title}
          Location: ${listing.location}
          Price per night: $${listing.pricePerNight}
          Max guests: ${listing.guests}
          Type: ${listing.type}
          Amenities: ${listing.amenities.join(", ")}
          Description: ${listing.description}

          Answer questions about this listing accurately based on the details above.
          If asked something not covered by the listing details, say you don't have that information.
        `;
      }
    }

    const messages = [
      new SystemMessage(systemPrompt),
      ...history.map(m => m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)),
      new HumanMessage(message),
    ];

    const aiResponse = await model.invoke(messages);
    const responseText = aiResponse.content as string;

    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: responseText });

    // Trim history to last 10 exchanges (20 messages)
    if (history.length > 20) {
      history = history.slice(history.length - 20);
    }

    chatHistories.set(sessionId, history);

    res.json({
      response: responseText,
      sessionId,
      messageCount: history.length
    });
  } catch (error: any) {
    if (error?.status === 429) {
      res.status(429).json({ message: "AI service is busy, please try again in a moment" });
      return;
    }
    next(error);
  }
};

// Part 4: AI Booking Recommendation
export const recommendListings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.userId!;

    const lastBookings = await prisma.booking.findMany({
      where: { guestId: userId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        listing: true
      }
    });

    if (lastBookings.length === 0) {
      res.status(400).json({ message: "No booking history found. Make some bookings first to get recommendations." });
      return;
    }

    const historySummary = lastBookings.map(b => ({
      location: b.listing.location,
      type: b.listing.type,
      price: b.listing.pricePerNight,
      guests: b.listing.guests
    }));

    const systemPrompt = `
      Analyze the user's booking history and suggest a recommendation.
      Return ONLY JSON in this format:
      {
        "preferences": "string describing what the user likes",
        "searchFilters": {
          "location": "string or null",
          "type": "string or null",
          "maxPrice": "number or null",
          "guests": "number or null"
        },
        "reason": "string explaining the recommendation"
      }
    `;

    const userPrompt = `Booking History: ${JSON.stringify(historySummary)}`;

    const aiResponse = await strictModel.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    let recommendation;
    try {
      recommendation = JSON.parse(aiResponse.content as string);
    } catch (e) {
      res.status(500).json({ message: "AI returned invalid JSON" });
      return;
    }

    const { searchFilters } = recommendation;
    const where: any = {
      NOT: {
        bookings: {
          some: { guestId: userId }
        }
      }
    };

    if (searchFilters.location) where.location = { contains: searchFilters.location, mode: 'insensitive' };
    if (searchFilters.type) where.type = searchFilters.type;
    if (searchFilters.maxPrice) where.pricePerNight = { lte: searchFilters.maxPrice };
    if (searchFilters.guests) where.guests = { gte: searchFilters.guests };

    const recommendations = await prisma.listing.findMany({
      where,
      take: 5,
      include: {
        host: { select: { name: true } }
      }
    });

    res.json({
      ...recommendation,
      recommendations
    });
  } catch (error: any) {
    if (error?.status === 429) {
      res.status(429).json({ message: "AI service is busy, please try again in a moment" });
      return;
    }
    next(error);
  }
};

// Part 5: Listing Review Summarizer
export const summarizeReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listingId = parseId(req.params.id);

    // Cache check
    const cacheKey = `ai:summary:${listingId}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        reviews: {
          include: {
            user: { select: { name: true } }
          }
        }
      }
    });

    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (listing.reviews.length < 3) {
      res.status(400).json({ message: "Not enough reviews to generate a summary (minimum 3 required)" });
      return;
    }

    const reviewsText = (listing.reviews as any[]).map((r: any) => `Reviewer: ${r.user.name}, Rating: ${r.rating}, Comment: ${r.comment}`).join("\n---\n");

    const systemPrompt = `
      Summarize guest reviews for a listing. Return ONLY JSON in this format:
      {
        "summary": "2-3 sentence overall summary",
        "positives": ["array of 3 praise items"],
        "negatives": ["array of complaints or empty array"]
      }
    `;

    const aiResponse = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Reviews:\n${reviewsText}`),
    ]);

    let summary;
    try {
      summary = JSON.parse(aiResponse.content as string);
    } catch (e) {
      res.status(500).json({ message: "AI returned invalid JSON" });
      return;
    }

    const totalReviews = (listing.reviews as any[]).length;
    const averageRating = (listing.reviews as any[]).reduce((acc: number, r: any) => acc + r.rating, 0) / totalReviews;

    const response = {
      ...summary,
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews
    };

    // Cache for 10 minutes (600 seconds)
    setCache(cacheKey, response, 600);

    res.json(response);
  } catch (error: any) {
    if (error?.status === 429) {
      res.status(429).json({ message: "AI service is busy, please try again in a moment" });
      return;
    }
    next(error);
  }
};
