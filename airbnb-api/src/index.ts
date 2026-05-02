import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import compression from "compression";
import morgan from "morgan";
import type { NextFunction } from "express";
import v1Router from "./routes/v1/index.js";
import { deprecateV1 } from "./middlewares/deprecation.middleware.js";
import { connectDB } from "./config/prisma.js";
import { setupSwagger } from "./config/swagger.js";
import { generalLimiter, strictLimiter } from "./middlewares/rateLimiter.js";

const app = express();
const port = Number(process.env["PORT"]) || 3000;

app.use(process.env["NODE_ENV"] === "production" ? morgan("combined") : morgan("dev"));

// Apply compression middleware
app.use(compression());

// Parse JSON bodies
app.use(express.json());

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Setup Swagger documentation
setupSwagger(app);

app.get("/health", (req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    uptime: process.uptime(), 
    timestamp: new Date() 
  });
});

// Apply strict rate limiter to all POST routes globally
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "POST") {
    return strictLimiter(req, res, next);
  }
  next();
});

// Mount v1 API with deprecation headers
app.use("/api/v1", deprecateV1, v1Router);

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Welcome to the Airbnb API",
    docs: "/api-docs",
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

// Connect to database
connectDB().catch((error: unknown) => {
  console.error("Failed to connect to database", error);
});

// For local development
if (process.env["NODE_ENV"] !== "production") {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app;