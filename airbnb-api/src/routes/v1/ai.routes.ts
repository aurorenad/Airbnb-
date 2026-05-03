import { Router } from "express";
import {
  aiSearch,
  generateListingDescription,
  aiChat,
  recommendListings,
  summarizeReviews,
} from "../../controllers/ai.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI-powered features using LangChain and Groq
 */

/**
 * @swagger
 * /ai/search:
 *   post:
 *     summary: Smart AI-powered listing search with pagination
 *     tags: [AI]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: "apartment in Kigali under $100 for 2 guests"
 *     responses:
 *       200:
 *         description: Search results with extracted filters
 *       400:
 *         description: Invalid query or no filters extracted
 */
router.post("/search", aiSearch);

/**
 * @swagger
 * /ai/listings/{id}/generate-description:
 *   post:
 *     summary: Generate an AI listing description with tone control
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tone:
 *                 type: string
 *                 enum: [professional, casual, luxury]
 *                 default: professional
 *     responses:
 *       200:
 *         description: Description generated and saved
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Listing not found
 */
router.post("/listings/:id/generate-description", authenticate, generateListingDescription);

/**
 * @swagger
 * /ai/chat:
 *   post:
 *     summary: Guest support chatbot with optional listing context
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, message]
 *             properties:
 *               sessionId:
 *                 type: string
 *               message:
 *                 type: string
 *               listingId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: AI response
 */
router.post("/chat", aiChat);

/**
 * @swagger
 * /ai/recommend:
 *   post:
 *     summary: AI-powered booking recommendations based on history
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recommended listings
 *       400:
 *         description: No booking history
 */
router.post("/recommend", authenticate, recommendListings);

/**
 * @swagger
 * /ai/listings/{id}/review-summary:
 *   get:
 *     summary: Generate an AI summary of guest reviews
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Structured review summary
 *       400:
 *         description: Not enough reviews
 *       404:
 *         description: Listing not found
 */
router.get("/listings/:id/review-summary", summarizeReviews);

export default router;
