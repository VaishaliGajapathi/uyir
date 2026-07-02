import { Request, Response, NextFunction } from "express";
import { cacheGet, cacheSet, redisEnabled } from "../lib/redis.js";

export function cacheMiddleware(ttlSeconds = 60) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!redisEnabled || req.method !== "GET") return next();

    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await cacheGet(key);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("Cache-TTL", ttlSeconds.toString());
        return res.json(cached);
      }
    } catch {
      // Cache miss or error, continue to handler
    }

    res.setHeader("X-Cache", "MISS");

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode === 200 && body) {
        cacheSet(key, body, ttlSeconds).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
}

export function invalidateCache(pattern: string) {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    next();
    import("../lib/redis.js").then(({ cacheDelPattern }) => {
      cacheDelPattern(pattern);
    });
  };
}
