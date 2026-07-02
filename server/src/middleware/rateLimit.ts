import { Request, Response, NextFunction } from "express";
import { rateLimitCheck } from "../lib/redis.js";

interface RateLimitOptions {
  max: number;
  windowSeconds: number;
  keyFn?: (req: Request) => string;
  message?: string;
}

export function redisRateLimit(opts: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = opts.keyFn
      ? opts.keyFn(req)
      : `rl:${req.ip}:${req.path}`;

    const result = await rateLimitCheck(identifier, opts.max, opts.windowSeconds);

    res.setHeader("X-RateLimit-Limit", opts.max.toString());
    res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
    if (result.resetAt) {
      res.setHeader("X-RateLimit-Reset", new Date(result.resetAt).toISOString());
    }

    if (!result.allowed) {
      return res.status(429).json({
        error: opts.message || "Too many requests. Please try again later.",
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      });
    }

    next();
  };
}

export const apiRateLimit = redisRateLimit({
  max: 100,
  windowSeconds: 60,
  message: "Too many API requests. Please slow down.",
});

export const authRateLimit = redisRateLimit({
  max: 10,
  windowSeconds: 60,
  keyFn: (req) => `rl:auth:${req.ip}:${req.body?.mobile || "unknown"}`,
  message: "Too many authentication attempts. Please wait a minute.",
});

export const otpRateLimit = redisRateLimit({
  max: 5,
  windowSeconds: 300,
  keyFn: (req) => `rl:otp:${req.body?.mobile || req.ip}`,
  message: "Too many OTP requests. Please wait 5 minutes.",
});
