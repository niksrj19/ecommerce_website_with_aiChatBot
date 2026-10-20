// src/core/redis/client.ts
import Redis, { RedisOptions } from "ioredis";
import { env } from "../../config/env.js";

const options: RedisOptions = {
  host: env.REDIS_HOST || "127.0.0.1",
  port: Number(env.REDIS_PORT) || 6379,
  password: env.REDIS_PASSWORD || "",
  db: Number(env.REDIS_DB) || 0,
  lazyConnect: false,
  //  connectTimeout: 10000,
  commandTimeout: 5000,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  tls: {                          // ← ADD THIS ENTIRE BLOCK
    rejectUnauthorized: false,    // ElastiCache uses AWS-managed cert
  },
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true; // Reconnect if cluster node switches to read-only
    }
    return false;
  },
};


// console.log("Redis connection options:", options);

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