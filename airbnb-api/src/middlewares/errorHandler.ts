import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod/v4";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  // Zod validation errors — return all field errors with human-readable messages
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join(", ");
    return res.status(400).json({ message, errors: err.issues });
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("Prisma error:", err.code, err.message, err.meta);
    switch (err.code) {
      case "P2002":
        return res.status(409).json({ message: `${String(err.meta?.target)} already exists` });
      case "P2025":
        return res.status(404).json({ message: "Record not found" });
      case "P2003":
        return res.status(400).json({ message: "Related record does not exist" });
      default:
        return res.status(500).json({ message: `Database error: ${err.code}` });
    }
  }

  // Prisma validation errors (wrong types etc.)
  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error("Prisma validation:", err.message);
    return res.status(400).json({ message: "Invalid data sent to database" });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ message: err instanceof Error ? err.message : "Something went wrong" });
}