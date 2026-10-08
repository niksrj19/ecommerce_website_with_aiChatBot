import { Worker, Job } from "bullmq";
import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { redis } from "../../core/redis/client";
import { ORDER_QUEUE_NAME } from "./order.queue";
import { OrderEmailJobPayload } from "./order.types";

// Mock or SMTP transporter
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || "smtp.gmail.com",
  port: Number(env.SMTP_PORT) || 587,
  secure: true,
  auth: {
    user: env.SMTP_USER || "test@ethereal.email",
    pass:env.SMTP_PASS || "secret",
  },
});

export const orderWorker = new Worker<OrderEmailJobPayload>(
  ORDER_QUEUE_NAME,
  async (job: Job<OrderEmailJobPayload>) => {
    const { orderId, userEmail, totalAmount, items } = job.data;

    console.log(`[Worker] Processing order confirmation email for Order #${orderId}`);

    const itemListHtml = items
      .map(
        (i) =>
          `<li>${i.title} (${i.size}, ${i.color}) x ${i.quantity} - $${(i.unitPrice * i.quantity).toFixed(2)}</li>`
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

    console.log(`[Worker] Successfully sent email to ${userEmail} for Order #${orderId}`);
  },
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }),
    concurrency: 5,
  }
);

orderWorker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
});