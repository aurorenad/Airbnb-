import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Zod validation errors — return all field errors at once
  if (err instanceof ZodError) {
    return res.status(400).json({ errors: err.issues });
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return res.status(409).json({ error: `${err.meta?.target} already exists` });
      case "P2025":
        return res.status(404).json({ error: "Record not found" });
      case "P2003":
        return res.status(400).json({ error: "Related record does not exist" });
      default:
        return res.status(500).json({ error: "Database error" });
    }
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
}