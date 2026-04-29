/**
 * @swagger
 * components:
 *   schemas:
 *     BookingStatus:
 *       type: string
 *       enum: [pending, confirmed, cancelled]
 *       example: confirmed
 */
export enum BookingStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    CANCELLED = 'cancelled'
}