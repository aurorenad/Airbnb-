import type { Booking } from "./booking.model.js";
import type { Listing } from "./listing.model.js";
import type { Role } from "./Role.js";

export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  role: Role;
  avatar?: string;
  bio?: string;
  createdAt: Date;
  listings:Listing[];
  bookings: Booking[];
  
}

export let users: User[] = [];
