import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string | undefined;
  role?: string | undefined;
  file?: Express.Multer.File | undefined;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } | undefined;
}

type JwtPayload = { userId: string; role: string };

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing or invalid token" });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "Missing or invalid token" });
    return;
  }
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    res.status(500).json({ message: "JWT_SECRET is not set" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as unknown as JwtPayload;
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireHost = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.role === "HOST" || req.role === "ADMIN") return next();
  res.status(403).json({ message: "Forbidden" });
};

export const requireGuest = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.role === "GUEST" || req.role === "ADMIN") return next();
  res.status(403).json({ message: "Forbidden" });
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.role === "ADMIN") return next();
  res.status(403).json({ message: "Forbidden" });
};

