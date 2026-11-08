import Redis, { type ClusterOptions, type RedisOptions } from "ioredis";
import { env } from "../../config/env.js";

type RedisConnectionOptions = {
  maxRetriesPerRequest: number | null;
  enableOfflineQueue?: boolean;
};

export const createRedisConnection = ({
  maxRetriesPerRequest,
  enableOfflineQueue,
}: RedisConnectionOptions) => {
  const redisOptions: RedisOptions = {
    host: env.REDIS_HOST || "127.0.0.1",
    port: Number(env.REDIS_PORT) || 6379,
    password: env.REDIS_PASSWORD || undefined,
    db: env.REDIS_DB ?? 0,
    connectTimeout: 10000,
    commandTimeout: 10000,
    maxRetriesPerRequest,
    enableOfflineQueue,
    ...(env.REDIS_TLS
      ? {
          tls: {
            rejectUnauthorized: false,
          },
        }
      : {}),
  };

  if (!env.REDIS_CLUSTER) {
    return new Redis(redisOptions);
  }

  const clusterOptions: ClusterOptions = {
    redisOptions,
    enableOfflineQueue,
    clusterRetryStrategy(times) {
      return Math.min(times * 100, 3000);
    },
  };

  return new Redis.Cluster(
    [
      {
        host: env.REDIS_HOST || "127.0.0.1",
        port: Number(env.REDIS_PORT) || 6379,
      },
    ],
    clusterOptions,
  );
};
