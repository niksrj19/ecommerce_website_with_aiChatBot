// src/core/redis/rate-limiter.ts
import { redis } from "./client";

export interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  windowInSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

export class SlidingWindowRateLimiter {
  /**
   * Evaluates if an identifier (e.g. IP, userId) has exceeded the rate limit
   */
  static async check(
    identifier: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const { keyPrefix, limit, windowInSeconds } = options;
    const now = Date.now();
    const windowMs = windowInSeconds * 1000;
    const clearBefore = now - windowMs;
    const redisKey = `ratelimit:${keyPrefix}:${identifier}`;

    // Execute atomically via Redis Pipeline
    const pipeline = redis.pipeline();

    // 1. Remove timestamps outside the active window
    pipeline.zremrangebyscore(redisKey, 0, clearBefore);

    // 2. Add current request timestamp (timestamp as score, unique string as member)
    const uniqueMember = `${now}-${Math.random().toString(36).substring(2, 9)}`;
    pipeline.zadd(redisKey, now, uniqueMember);

    // 3. Count remaining requests within current window
    pipeline.zcard(redisKey);

    // 4. Set TTL on the set equal to window size
    pipeline.expire(redisKey, windowInSeconds);

    const results = await pipeline.exec();

    // The result of zcard is at index 2: [err, count]
    const count = (results?.[2]?.[1] as number) || 0;

    const remaining = Math.max(0, limit - count);
    const success = count <= limit;

    return {
      success,
      limit,
      remaining,
      resetInSeconds: windowInSeconds,
    };
  }
}