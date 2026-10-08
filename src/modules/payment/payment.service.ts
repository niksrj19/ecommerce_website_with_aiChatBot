import crypto from "crypto";
import Razorpay from "razorpay";
import { db } from "../../core/database";
import { env } from "../../config/env";
import { CreateIntentInput, VerifyPaymentInput } from "./payment.schema";
import { RazorpayCreateOrderResult } from "./payment.types";
import { dispatchOrderCreatedJob } from "../order/order.queue";

const razorpay = new Razorpay({
  key_id: env.PAYMENT_KEY_ID,
  key_secret: env.PAYMENT_KEY_SECRET,
});

export class PaymentService {
  /**
   * Generates a Razorpay Gateway Order for a pending internal order
   */
  static async createPaymentIntent(
    userId: string,
    input: CreateIntentInput
  ): Promise<RazorpayCreateOrderResult> {

    console.log("Creating payment intent for user:", userId, "with input:", input);
    // 1. Fetch order and verify ownership & status
    const order = await db.order.findFirst({
      where: { id: input.orderId, userId },
      include: { items: true },
    });

    console.log("Fetched order:", order);
    if (!order) {
      const error: any = new Error("Order not found or unauthorized");
      error.statusCode = 404;
      throw error;
    }

    if (order.paymentStatus === "PAID") {
      const error: any = new Error("Order has already been paid");
      error.statusCode = 400;
      throw error;
    }

    // 2. Amount in smallest currency sub-unit (e.g. INR paise -> * 100)
    const amountInSubunits = Math.round(Number(order.totalAmount) * 100);

    // 3. Create Gateway Order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInSubunits,
      currency: "INR",
      receipt: order.id,
      notes: { internalOrderId: order.id, userId },
    });

    // 4. Cache gateway order ID onto the Order
    await db.order.update({
      where: { id: order.id },
      data: { gatewayOrderId: razorpayOrder.id },
    });

    return {
      gatewayOrderId: razorpayOrder.id,
      amount: amountInSubunits,
      currency: "INR",
      keyId: env.PAYMENT_KEY_ID,
      orderId: order.id,
    };
  }

  /**
   * Synchronous client verification fallback (HMAC-SHA256 of gatewayOrderId|paymentId)
   */
  static async verifyPayment(userId: string, input: VerifyPaymentInput): Promise<void> {
    const { orderId, paymentId, signature } = input;

    const order = await db.order.findFirst({
      where: { id: orderId, userId },
      include: { user: true, items: true },
    });

    if (!order || !order.gatewayOrderId) {
      const error: any = new Error("Order or gateway session not found");
      error.statusCode = 404;
      throw error;
    }

    if (order.paymentStatus === "PAID") {
      return; // Idempotent: already processed
    }

    // Cryptographic signature check: HMAC_SHA256(order_id + "|" + razorpay_payment_id, secret)
    const expectedSignature = crypto
      .createHmac("sha256", env.PAYMENT_KEY_SECRET)
      .update(`${order.gatewayOrderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      const error: any = new Error("Invalid payment signature");
      error.statusCode = 400;
      throw error;
    }

    // Execute idempotent state transition
    await this.markOrderAsPaid(order.id, paymentId, "RAZORPAY_CHECKOUT");
  }

  /**
   * Idempotent order state transition with BullMQ notification trigger
   */
  static async markOrderAsPaid(
    orderId: string,
    paymentId: string,
    paymentMethod: string
  ): Promise<boolean> {
    return db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { user: true, items: true },
      });

      if (!order) return false;

      // Idempotency check: if already confirmed/paid, ignore
      if (order.paymentStatus === "PAID") {
        return true;
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CONFIRMED",
          paymentStatus: "PAID",
          paymentId,
          paymentMethod,
        },
      });

      // Dispatch asynchronous confirmation job to BullMQ
      dispatchOrderCreatedJob({
        orderId: order.id,
        userEmail: order.user.email,
        totalAmount: Number(order.totalAmount),
        items: order.items.map((i) => ({
          title: i.title,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
        })),
      }).catch((err) => console.error("[Payment] Failed to enqueue email job:", err));

      return true;
    });
  }
}