
import Redis from "ioredis";
import { Queue } from "bullmq";
import { env } from "../../config/env.js";
import { OrderEmailJobPayload } from "./order.types.js";

export const ORDER_QUEUE_NAME = "order-processing";

const queueRedis = new Redis.Cluster(
  [
    {
      host: env.REDIS_HOST || "127.0.0.1",
      port: Number(env.REDIS_PORT) || 6379,
    },
  ],
  {
    redisOptions: {
      password: env.REDIS_PASSWORD || undefined,
      connectTimeout: 10000,
      commandTimeout: 10000,
      maxRetriesPerRequest: 3,
      tls: {
        rejectUnauthorized: true,
      },
    },

    clusterRetryStrategy(times) {
      return Math.min(times * 100, 3000);
    },
  },
);

export const orderQueue = new Queue<OrderEmailJobPayload>(
  ORDER_QUEUE_NAME,
  {
    connection: queueRedis,
    prefix: "{order-processing}",

    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  },
);

export const dispatchOrderCreatedJob = async (
  payload: OrderEmailJobPayload,
) => {
  await orderQueue.add("send_order_confirmation", payload);
};