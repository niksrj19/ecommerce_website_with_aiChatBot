// src/middlewares/rate-limit.ts
import { Request, Response, NextFunction } from "express";
import { SlidingWindowRateLimiter } from "../core/redis/rate-limiter";

export const rateLimit = (limit: number = 60, windowInSeconds: number = 60) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const identifier =
      req.user?.userId ||
      (req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      "unknown-client";

    const result = await SlidingWindowRateLimiter.check(identifier, {
      keyPrefix: req.baseUrl || "global",
      limit,
      windowInSeconds,
    });

    res.setHeader("X-RateLimit-Limit", result.limit);
    res.setHeader("X-RateLimit-Remaining", result.remaining);
    res.setHeader("X-RateLimit-Reset", result.resetInSeconds);

    if (!result.success) {
      res.status(429).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${result.resetInSeconds} seconds.`,
      });
      return;
    }

    next();
  };
};