import { Request, Response, NextFunction } from "express";
import { authService } from "../auth";
import { User } from "@shared/schema";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const user = await authService.getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function requireAccountType(accountType: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const allowedTypes = Array.isArray(accountType) ? accountType : [accountType];
    if (!allowedTypes.includes(req.user.accountType)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}