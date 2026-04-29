import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set.");
}

// Create a connection pool with optimized settings
const pool = new Pool({
  connectionString: databaseUrl,
  max: 10, // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout when acquiring connection
});

const adapter = new PrismaPg({ connectionString: databaseUrl });

const prisma = new PrismaClient({
  adapter,
});

export const connectDB = async (): Promise<void> => {
  await prisma.$connect();
  console.log("Connected to PostgreSQL with Prisma");
};

export default prisma;
