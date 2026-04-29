import { BookingStatus } from './bookingStatus.js';
import type { Listing } from './listing.model.js';
import type { User } from './user.model.js';

export interface Booking {
    id: number;
    checkIn: Date;
    checkOut: Date;
    totalPrice: number;
    status: BookingStatus;
    createdAt: string;
    guest: number;
    guestId: User['id'];
    listing: number;
    listingId: Listing['id'];
}
export let bookings: Booking[] = [];