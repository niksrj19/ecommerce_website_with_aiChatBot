import { Queue } from "bullmq";
import { redis } from "../../core/redis/client";
import { OrderEmailJobPayload } from "./order.types";

export const ORDER_QUEUE_NAME = "order-processing";

// BullMQ uses ioredis instance directly
export const orderQueue = new Queue<OrderEmailJobPayload>(ORDER_QUEUE_NAME, {
  connection: redis.duplicate(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: true,
    removeOnFail: false, // Keep in queue for Dead Letter Queue review
  },
});

export const dispatchOrderCreatedJob = async (payload: OrderEmailJobPayload) => {
  await orderQueue.add("send_order_confirmation", payload);
};