/**
 * @swagger
 * components:
 *   schemas:
 *     ListingType:
 *       type: string
 *       enum: [apartment, house, villa, cabin]
 *       example: house
 */
export enum ListingType {
    APARTMENT = 'apartment',
    HOUSE = 'house',
    VILLA = 'villa',
    CABIN = 'cabin'
}