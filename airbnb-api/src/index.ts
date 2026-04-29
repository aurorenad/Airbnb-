import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import usersRouter from "./routes/users.routes.js";
import listingsRouter from "./routes/listings.routes.js";
import bookingsRouter from "./routes/bookings.routes.js";
import authRouter from "./routes/auth.routes.js";
import uploadRouter from "./routes/upload.routes.js";
import { connectDB } from "./config/prisma.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { setupSwagger } from "./config/swagger.js";
import reviewsRouter from "./routes/reviews.routes.js";

const app = express();
const port = Number(process.env["PORT"] ?? 3000);

app.use(express.json());

setupSwagger(app);

app.use("/users", usersRouter);
app.use("/listings", listingsRouter);
app.use("/bookings", bookingsRouter);
app.use("/auth", authRouter);
app.use("/reviews", reviewsRouter);
app.use("/", uploadRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);

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