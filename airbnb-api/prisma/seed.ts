import "dotenv/config";
import { PrismaClient, Role, ListingType, BookingStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seeding...");

  // 1. Clean existing data
  console.log("🧹 Cleaning existing data...");
  await prisma.booking.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create users
  console.log("👤 Creating users...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  const host1 = await prisma.user.create({
    data: {
      name: "Alice Johnson",
      email: "alice@example.com",
      username: "alice_host",
      password: hashedPassword,
      phone: "+1234567890",
      role: Role.HOST,
      bio: "Welcome to my luxury listings!",
    },
  });

  const host2 = await prisma.user.create({
    data: {
      name: "Bob smith",
      email: "bob@example.com",
      username: "bobhost",
      password: hashedPassword,
      phone: "+0987654321",
      role: Role.HOST,
      bio: "Experienced host in the city center.",
    },
  });

  const guest1 = await prisma.user.create({
    data: {
      name: "Carol White",
      email: "carol@example.com",
      username: "carol_guest",
      password: hashedPassword,
      phone: "+1122334455",
      role: Role.GUEST,
    },
  });

  const guest2 = await prisma.user.create({
    data: {
      name: "David Johnson",
      email: "david@example.com",
      username: "davidguest",
      password: hashedPassword,
      phone: "+5544332211",
      role: Role.GUEST,
    },
  });

  const guest3 = await prisma.user.create({
    data: {
      name: "Eve Adams",
      email: "eve@example.com",
      username: "eveguest",
      password: hashedPassword,
      phone: "+9988776655",
      role: Role.GUEST,
    },
  });

  // 3. Create listings
  console.log("🏠 Creating listings...");
  const listing1 = await prisma.listing.create({
    data: {
      title: "Modern Downtown Apartment",
      description: "A sleek apartment in the heart of the city.",
      location: "New York, NY",
      pricePerNight: 200.0,
      guests: 2,
      type: ListingType.APARTMENT,
      amenities: ["WiFi", "Kitchen", "AC"],
      hostId: host1.id,
    },
  });

  const listing2 = await prisma.listing.create({
    data: {
      title: "Spacious Family House",
      description: "Perfect for large families with a big backyard.",
      location: "Austin, TX",
      pricePerNight: 350.0,
      guests: 6,
      type: ListingType.HOUSE,
      amenities: ["Pool", "Garden", "Garage"],
      hostId: host1.id,
    },
  });

  const listing3 = await prisma.listing.create({
    data: {
      title: "Luxury Beachfront Villa",
      description: "Stunning views and private beach access.",
      location: "Malibu, CA",
      pricePerNight: 800.0,
      guests: 8,
      type: ListingType.VILLA,
      amenities: ["Ocean View", "Hot Tub", "Chef Service"],
      hostId: host2.id,
    },
  });

  const listing4 = await prisma.listing.create({
    data: {
      title: "Cozy Mountain Cabin",
      description: "Escape to nature in this beautiful wooden cabin.",
      location: "Aspen, CO",
      pricePerNight: 150.0,
      guests: 4,
      type: ListingType.CABIN,
      amenities: ["Fireplace", "Hiking Trails", "Mountain View"],
      hostId: host2.id,
    },
  });

  // 4. Create bookings
  console.log("📅 Creating bookings...");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  await prisma.booking.create({
    data: {
      checkIn: tomorrow,
      checkOut: nextWeek,
      totalPrice: 200.0 * 6, // 6 nights
      status: BookingStatus.CONFIRMED,
      guests: 2,
      guestId: guest1.id,
      listingId: listing1.id,
    },
  });

  const inTwoWeeks = new Date();
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
  const inThreeWeeks = new Date();
  inThreeWeeks.setDate(inThreeWeeks.getDate() + 21);

  await prisma.booking.create({
    data: {
      checkIn: inTwoWeeks,
      checkOut: inThreeWeeks,
      totalPrice: 150.0 * 7, // 7 nights
      status: BookingStatus.PENDING,
      guests: 1,
      guestId: guest2.id,
      listingId: listing4.id,
    },
  });

  const inAMonth = new Date();
  inAMonth.setMonth(inAMonth.getMonth() + 1);
  const inAMonthPlusThreeDays = new Date(inAMonth);
  inAMonthPlusThreeDays.setDate(inAMonthPlusThreeDays.getDate() + 3);

  await prisma.booking.create({
    data: {
      checkIn: inAMonth,
      checkOut: inAMonthPlusThreeDays,
      totalPrice: 800.0 * 3, // 3 nights
      status: BookingStatus.CONFIRMED,
      guests: 4,
      guestId: guest3.id,
      listingId: listing3.id,
    },
  });

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
