import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set.");
}

// Enable SSL for Render-hosted PostgreSQL (external connections require it)
const isRemote = databaseUrl.includes("render.com") || databaseUrl.includes("sslmode=require");

const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

export const connectDB = async (): Promise<void> => {
  await prisma.$connect();
  console.log("Connected to PostgreSQL with Prisma");
};

export default prisma;
