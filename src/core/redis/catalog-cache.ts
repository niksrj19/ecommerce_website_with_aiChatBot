import { redis } from "./client.js";

const VERSION_KEY = "catalog:cache:version";

export class CatalogCache {
  static async get<T>(key: string): Promise<T | null> {
    try {
      await redis.set(VERSION_KEY, "1", "NX");
      const version = await redis.get(VERSION_KEY);
      if (version === null) return null;

      const cached = await redis.get(`catalog:v${version}:${key}`);
      return cached === null ? null : (JSON.parse(cached) as T);
    } catch (error) {
      console.error("Failed to read catalog cache:", error);
      return null;
    }
  }

  static async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await redis.set(VERSION_KEY, "1", "NX");
      const version = await redis.get(VERSION_KEY);
      if (version !== null) {
        await redis.set(`catalog:v${version}:${key}`, JSON.stringify(value), "EX", ttlSeconds);
      }
    } catch (error) {
      console.error("Failed to write catalog cache:", error);
    }
  }

  static async invalidate(): Promise<void> {
    try {
      await redis.incr(VERSION_KEY);
    } catch (error) {
      console.error("Failed to invalidate catalog cache:", error);
    }
  }
}
