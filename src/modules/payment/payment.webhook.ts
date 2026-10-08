import crypto from "crypto";
import { Request, Response } from "express";
import { env } from "../../config/env";
import { db } from "../../core/database";
import { PaymentService } from "./payment.service";
import { RazorpayWebhookPayload } from "./payment.types";

export class PaymentWebhookHandler {
  /**
   * Listens for raw HTTP POST webhooks from Razorpay
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers["x-razorpay-signature"] as string;

      if (!signature) {
        res.status(400).json({ error: "Missing webhook signature header" });
        return;
      }

      // Raw body buffer is required for cryptographic integrity
      const rawBody = req.body;
      if (!Buffer.isBuffer(rawBody)) {
        res.status(500).json({ error: "Server misconfiguration: raw body buffer expected" });
        return;
      }

      // Validate HMAC-SHA256
      const expectedSignature = crypto
        .createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        res.status(400).json({ error: "Invalid webhook signature" });
        return;
      }

      // Parse payload from raw buffer
      const eventPayload: RazorpayWebhookPayload = JSON.parse(rawBody.toString("utf8"));

      if (eventPayload.event === "payment.captured" || eventPayload.event === "order.paid") {
        const paymentEntity = eventPayload.payload.payment.entity;
        const gatewayOrderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;
        const method = paymentEntity.method;

        // Locate internal order via gatewayOrderId
        const order = await db.order.findFirst({
          where: { gatewayOrderId },
          select: { id: true },
        });

        if (order) {
          await PaymentService.markOrderAsPaid(order.id, paymentId, method);
        }
      }

      // Acknowledge receipt to the gateway immediately
      res.status(200).json({ status: "ok" });
    } catch (error: any) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ error: "Internal webhook processing failure" });
    }
  }
}