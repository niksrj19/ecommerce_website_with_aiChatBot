
import Redis, { type ClusterOptions } from "ioredis";
import { env } from "../../config/env.js";

const redisHost = env.REDIS_HOST || "127.0.0.1";
const redisPort = Number(env.REDIS_PORT) || 6379;
const redisPassword = env.REDIS_PASSWORD || undefined;

const clusterOptions: ClusterOptions = {
  clusterRetryStrategy(times) {
    return Math.min(times * 100, 3000);
  },

  redisOptions: {
    password: redisPassword,
    connectTimeout: 10000,
    commandTimeout: 10000,
    maxRetriesPerRequest: 3,

    // Enable TLS for the AWS ElastiCache endpoint.
    // Prefer certificate verification in production.
    tls: {
      rejectUnauthorized: false,
    },
  },

  // Do not silently queue commands while disconnected.
  enableOfflineQueue: false,
};

export const redis = new Redis.Cluster(
  [
    {
      host: redisHost,
      port: redisPort,
    },
  ],
  clusterOptions,
);

redis.on("connect", () => {
  console.log("Connected to Redis Cluster");
});

redis.on("error", (err) => {
  console.error("Redis Cluster error:", err.message);
});

redis.on("close", () => {
  console.warn("Redis Cluster connection closed");
});
