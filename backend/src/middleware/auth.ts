import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = "your_jwt_secret"; // позже вынесем в .env

interface JwtPayload {
  userId: number;
}

export interface AuthenticatedRequest extends Request {
  userId?: number;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

  if (!token) return res.status(401).json({ error: "Access token missing" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.userId = payload.userId;
    next();
  } catch {
    res.status(403).json({ error: "Invalid or expired token" });
  }
}
