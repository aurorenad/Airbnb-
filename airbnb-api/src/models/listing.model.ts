import type { Booking } from "./booking.model.js";
import type { ListingType } from "./ListingType.js";
import type { User } from "./user.model.js";

export interface Listing {
  id: number;
  title: string;
  description: string;
  location: string;
  pricePerNight: number;
  guests: number;
  type: ListingType;
  amenities: string[];
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
  host: string;
  hostId: User['id'];
  bookings: Booking[];
}

export let listings: Listing[] = [];
function autoincrement() {
  throw new Error("Function not implemented.");
}

