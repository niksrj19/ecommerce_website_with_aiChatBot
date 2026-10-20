
import Redis from "ioredis";
import { Worker, Job } from "bullmq";
import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import { ORDER_QUEUE_NAME } from "./order.queue.js";
import { OrderEmailJobPayload } from "./order.types.js";

const workerRedis = new Redis.Cluster(
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
      maxRetriesPerRequest: null,
      tls: {
        rejectUnauthorized: false,
      },
    },
    clusterRetryStrategy(times) {
      return Math.min(times * 100, 3000);
    },
  },
);

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || "smtp.gmail.com",
  port: Number(env.SMTP_PORT) || 587,
  secure: true,
  auth: {
    user: env.SMTP_USER || "test@ethereal.email",
    pass: env.SMTP_PASS || "secret",
  },
});

export const orderWorker = new Worker<OrderEmailJobPayload>(
  ORDER_QUEUE_NAME,
  async (job: Job<OrderEmailJobPayload>) => {
    const { orderId, userEmail, totalAmount, items } = job.data;

    const itemListHtml = items
      .map(
        (item) =>
          `<li>${item.title} (${item.size}, ${item.color}) x ${
            item.quantity
          } - $${(item.unitPrice * item.quantity).toFixed(2)}</li>`,
      )
      .join("");

    await transporter.sendMail({
      from: '"AegisCommerce" <no-reply@aegiscommerce.com>',
      to: userEmail,
      subject: `Order Confirmation #${orderId}`,
      html: `
        <h2>Thank you for your purchase!</h2>
        <p>Order ID: <strong>${orderId}</strong></p>
        <p>Total Paid: <strong>$${totalAmount.toFixed(2)}</strong></p>
        <ul>${itemListHtml}</ul>
      `,
    });
  },
  {
    connection: workerRedis,
    prefix: "{order-processing}",
    concurrency: 5,
  },
);

orderWorker.on("failed", (job, err) => {
  console.error(
    `[Worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
    err.message,
  );
});
