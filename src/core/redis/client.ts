// src/core/redis/client.ts
import Redis, { RedisOptions } from "ioredis";
import { env } from "../../config/env";

const options: RedisOptions = {
  host: env.REDIS_HOST || "127.0.0.1",
  port: Number(env.REDIS_PORT) || 6379,
  password: env.REDIS_PASSWORD || "",
  db: Number(env.REDIS_DB) || 0,
  lazyConnect: false,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true; // Reconnect if cluster node switches to read-only
    }
    return false;
  },
};


console.log("Redis connection options:", options);

const redis = new Redis(options);

redis.on("connect", () => {
  console.log(" Connected to Redis successfully");
});

redis.on("error", (err) => {
  console.error("❌ Redis Connection Error:", err.message);
});

redis.on("close", () => {
  console.warn("⚠️  Redis connection closed");
});

export { redis };