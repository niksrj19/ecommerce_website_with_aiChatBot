import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import type { OrderEmailDetails } from "./order.types.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendOrderConfirmationEmail(payload: OrderEmailDetails): Promise<void> {
  const { orderId, userEmail, totalAmount, items } = payload;
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
}
