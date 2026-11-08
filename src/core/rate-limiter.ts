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
  private static requests = new Map<string, { timestamps: number[]; windowMs: number }>();
  private static cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of this.requests) {
      const active = entry.timestamps.filter((timestamp) => timestamp > now - entry.windowMs);
      if (active.length) this.requests.set(key, { ...entry, timestamps: active });
      else this.requests.delete(key);
    }
  }, 60 * 1000).unref();

  static async check(
    identifier: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const { keyPrefix, limit, windowInSeconds } = options;
    const now = Date.now();
    const windowMs = windowInSeconds * 1000;
    const clearBefore = now - windowMs;
    const key = `${keyPrefix}:${identifier}`;
    const timestamps = (this.requests.get(key)?.timestamps ?? []).filter((timestamp) => timestamp > clearBefore);
    timestamps.push(now);
    this.requests.set(key, { timestamps, windowMs });
    const count = timestamps.length;

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