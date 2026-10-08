import { z } from "zod";

export const createIntentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format. Must be a valid UUID"),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  paymentId: z.string().trim().min(1, "paymentId is required"),
  signature: z.string().trim().min(1, "signature is required"),
});

export type CreateIntentInput = z.infer<typeof createIntentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;