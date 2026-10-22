
import { Queue } from "bullmq";
import { createRedisConnection } from "../../core/redis/client.js";
import { OrderEmailJobPayload } from "./order.types.js";

export const ORDER_QUEUE_NAME = "order-processing";

const queueRedis = createRedisConnection({ maxRetriesPerRequest: 3 });

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