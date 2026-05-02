import { Router } from "express";
import {
  createBooking,
  deleteBooking,
  getAllBookings,
  getBookingById,
  getUserBookings,
} from "../../controllers/bookings.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         checkIn:
 *           type: string
 *           format: date-time
 *           example: "2024-05-01T14:00:00Z"
 *         checkOut:
 *           type: string
 *           format: date-time
 *           example: "2024-05-05T10:00:00Z"
 *         total:
 *           type: number
 *           example: 600.0
 *         status:
 *           $ref: '#/components/schemas/BookingStatus'
 *         userId:
 *           type: integer
 *           example: 10
 *         listingId:
 *           type: integer
 *           example: 5
 *         user:
 *           $ref: '#/components/schemas/User'
 *         listing:
 *           $ref: '#/components/schemas/Listing'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-04-28T10:00:00Z"
 *     CreateBookingInput:
 *       type: object
 *       required: [listingId, userId, checkIn, checkOut]
 *       properties:
 *         listingId:
 *           type: integer
 *           example: 5
 *         userId:
 *           type: integer
 *           example: 10
 *         checkIn:
 *           type: string
 *           format: date-time
 *           example: "2024-05-01T14:00:00Z"
 *         checkOut:
 *           type: string
 *           format: date-time
 *           example: "2024-05-05T10:00:00Z"
 */

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get all bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Paginated bookings with user and listing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", getAllBookings);

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Booking details with user and listing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", getBookingById);

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     description: total is auto-calculated from pricePerNight × nights
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBookingInput'
 *     responses:
 *       201:
 *         description: Booking created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", createBooking);

/**
 * @swagger
 * /bookings/{id}:
 *   delete:
 *     summary: Cancel a booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", deleteBooking);

export default router;
