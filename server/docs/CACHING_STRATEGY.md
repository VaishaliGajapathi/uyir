# Caching Layer Strategy: Redis

## Current State
- No caching layer
- Every donor alert cycle queries database for all matching donors
- No session caching
- No query result caching

## Recommended Solution: Redis

### Why Redis?
- **In-memory performance**: Sub-millisecond response times
- **Data structures**: Supports strings, hashes, lists, sets, sorted sets
- **Persistence**: Optional disk persistence for durability
- **Scalability**: Horizontal scaling with Redis Cluster
- **Ecosystem**: Mature client libraries (ioredis, redis)

## Use Cases

### 1. Donor Matching Cache
**Problem**: Alert cycle queries database for all matching donors every time
**Solution**: Cache donor availability by blood group and district

```typescript
// Cache key: donor:available:{bloodGroup}:{district}
// TTL: 5 minutes
const cacheKey = `donor:available:${bloodGroup}:${district}`;
let donors = await redis.get(cacheKey);

if (!donors) {
  donors = await query<User>(`
    SELECT * FROM "User"
    WHERE "bloodGroup" = $1 AND "district" = $2
      AND "isAvailable" = true AND "banned" = false
  `, [bloodGroup, district]);
  await redis.setex(cacheKey, 300, JSON.stringify(donors));
}
```

### 2. Session Cache
**Problem**: JWT tokens are stateless, no session invalidation
**Solution**: Cache active sessions for revocation

```typescript
// Cache key: session:{userId}
// TTL: 30 days (matches JWT expiration)
await redis.setex(`session:${userId}`, 2592000, token);
```

### 3. Request Status Cache
**Problem**: Frequent status checks for active requests
**Solution**: Cache request status with short TTL

```typescript
// Cache key: request:{requestId}
// TTL: 1 minute
const cacheKey = `request:${requestId}`;
let request = await redis.get(cacheKey);

if (!request) {
  request = await queryOne<BloodRequest>(`SELECT * FROM "BloodRequest" WHERE "id" = $1`, [requestId]);
  await redis.setex(cacheKey, 60, JSON.stringify(request));
}
```

### 4. Rate Limiting Cache
**Problem**: In-memory rate limiting doesn't scale across instances
**Solution**: Redis-based rate limiting

```typescript
// Cache key: ratelimit:{ip}:{endpoint}
// TTL: 15 minutes
const key = `ratelimit:${ip}:${endpoint}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 900);
if (count > limit) return res.status(429).json({ error: "Too many requests" });
```

## Implementation Steps

### Phase 1: Setup (1 day)
1. Install Redis client:
   ```bash
   npm install ioredis
   ```

2. Configure Redis connection:
   ```typescript
   // src/lib/redis.ts
   import Redis from "ioredis";
   
   const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
   export { redis };
   ```

3. Add environment variable:
   ```
   REDIS_URL=redis://localhost:6379
   ```

### Phase 2: Donor Matching Cache (1-2 days)
1. Implement cache layer in `services/alerts.ts`
2. Add cache invalidation on donor profile updates
3. Add cache warmup on server startup

### Phase 3: Session Cache (1 day)
1. Implement session caching in auth routes
2. Add session invalidation endpoint
3. Update JWT verification to check cache

### Phase 4: Request Status Cache (1 day)
1. Implement request status caching
2. Add cache invalidation on status changes
3. Update request routes to use cache

### Phase 5: Rate Limiting Cache (1 day)
1. Replace in-memory rate limiting with Redis
2. Configure distributed rate limiting
3. Add rate limit bypass for trusted IPs

## Cache Invalidation Strategy

### Time-Based Invalidation
- **Donor availability**: 5 minutes TTL
- **Request status**: 1 minute TTL
- **Sessions**: 30 days TTL
- **Rate limits**: 15 minutes TTL

### Event-Based Invalidation
```typescript
// Invalidate donor cache on profile update
usersRouter.patch("/me", requireAuth, async (req: AuthedRequest, res: any) => {
  // ... update logic ...
  const user = await queryOne<User>(...);
  
  // Invalidate cache
  await redis.del(`donor:available:${user.bloodGroup}:${user.district}`);
  
  res.json(user);
});
```

## Fallback Strategy
If Redis is unavailable, fall back to database queries:

```typescript
async function getCachedOrQuery<T>(key: string, ttl: number, queryFn: () => Promise<T>): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch (error) {
    console.error("[cache] Redis error, falling back to DB:", error);
  }
  
  const data = await queryFn();
  
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error("[cache] Failed to cache:", error);
  }
  
  return data;
}
```

## Production Considerations

### Redis Configuration
```typescript
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableReadyCheck: true,
});
```

### Monitoring
- Track cache hit/miss ratios
- Monitor Redis memory usage
- Alert on connection failures

### Scaling
- Use Redis Cluster for horizontal scaling
- Configure read replicas for read-heavy workloads
- Use Redis Sentinel for high availability

## Timeline Estimate
- **Total implementation time**: 5-6 days
- **Risk level**: Low (with fallback strategy)
- **Performance impact**: 50-80% reduction in database load for alert cycles

## Alternative: In-Memory Cache (Node-Cache)
For smaller deployments, consider `node-cache`:
- No external dependency
- Simpler setup
- Limited to single instance
- Not recommended for production scaling
