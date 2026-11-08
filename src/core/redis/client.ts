
import { env } from "../../config/env.js";
import { createRedisConnection } from "./create-connection.js";

export const redis = createRedisConnection({
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
});

redis.on("connect", () => {
  console.log(`Connected to Redis ${env.REDIS_CLUSTER ? "Cluster" : "instance"}`);
});

redis.on("error", (err) => {
  console.error(
    `Redis ${env.REDIS_CLUSTER ? "Cluster" : "connection"} error:`,
    err.message,
  );
});

redis.on("close", () => {
  console.warn(
    `Redis ${env.REDIS_CLUSTER ? "Cluster" : "connection"} closed`,
  );
});
