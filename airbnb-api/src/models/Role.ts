/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: string
 *       enum: [admin, host, guest]
 *       example: guest
 */
export enum Role {
    ADMIN = 'admin',
    HOST = 'host',
    GUEST = 'guest'
}