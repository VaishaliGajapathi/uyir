import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "change-this-secret";

export interface AuthedRequest extends Request {
  userId?: string;
  role?: string;
  params: any;
  body: any;
  headers: any;
}

export function signToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, SECRET, { expiresIn: "30d" });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(header.slice(7), SECRET) as { userId: string; role: string };
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireAdminOrHospitalApprover(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(header.slice(7), SECRET) as { userId: string; role: string };
    if (decoded.role !== "admin" && decoded.role !== "verifier" && decoded.role !== "hospital_approver") {
      return res.status(403).json({ error: "Forbidden: Admin or hospital approver required" });
    }
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireAdminOrVerifier(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(header.slice(7), SECRET) as { userId: string; role: string };
    if (decoded.role !== "admin" && decoded.role !== "verifier") {
      return res.status(403).json({ error: "Forbidden: Admin or verifier required" });
    }
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(header.slice(7), SECRET) as { userId: string; role: string };
      req.userId = decoded.userId;
      req.role = decoded.role;
    } catch {
      /* ignore */
    }
  }
  next();
}
