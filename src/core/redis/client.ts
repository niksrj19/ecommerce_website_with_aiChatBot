
import Redis, { type ClusterOptions, type RedisOptions } from "ioredis";
import { env } from "../../config/env.js";

const redisHost = env.REDIS_HOST;
const redisPort = env.REDIS_PORT;

const redisOptions: RedisOptions = {
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
  connectTimeout: 10000,
  commandTimeout: 10000,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  ...(env.REDIS_TLS ? { tls: {} } : {}),
};

const clusterOptions: ClusterOptions = {
  clusterRetryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
};

export function createRedisConnection(overrides: RedisOptions = {}) {
  const options: RedisOptions = { ...redisOptions, ...overrides };

  const connection = env.REDIS_CLUSTER
    ? new Redis.Cluster([{ host: redisHost, port: redisPort }], {
        ...clusterOptions,
        redisOptions: options,
      })
    : new Redis({ host: redisHost, port: redisPort, ...options });

  connection.on("error", (err) => {
    console.error("Redis error:", err.message);
  });
  connection.on("close", () => {
    console.warn("Redis connection closed");
  });

  return connection;
}

export const redis = createRedisConnection();

redis.on("connect", () => {
  console.log(`Connected to Redis${env.REDIS_CLUSTER ? " Cluster" : ""}`);
});
