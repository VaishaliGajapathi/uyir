import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL;

export const redisEnabled = !!redisUrl;

export const redis = redisUrl
  ? new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      keepAlive: 30000,
      connectTimeout: 10000,
    })
  : null;

if (redis) {
  redis.on("error", (err) => {
    console.error("[redis] Error:", err.message);
  });
  redis.on("connect", () => {
    console.log("[redis] Connected to Upstash Redis");
  });
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: any, ttlSeconds = 60): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err: any) {
    console.error("[redis] cacheSet error:", err.message);
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err: any) {
    console.error("[redis] cacheDel error:", err.message);
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch (err: any) {
    console.error("[redis] cacheDelPattern error:", err.message);
  }
}

export async function rateLimitCheck(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (!redis) return { allowed: true, remaining: maxRequests, resetAt: 0 };
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    const ttl = await redis.ttl(key);
    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetAt: Date.now() + ttl * 1000,
    };
  } catch {
    return { allowed: true, remaining: maxRequests, resetAt: 0 };
  }
}
