// src/modules/cart/cart.schema.ts
import { z } from "zod";

export const addCartItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  size: z.string().trim().min(1, "Size is required"),
  color: z.string().trim().min(1, "Color is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

export const updateCartItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  size: z.string().trim().min(1, "Size is required"),
  color: z.string().trim().min(1, "Color is required"),
  quantity: z.number().int().nonnegative("Quantity must be >= 0"),
});

export const removeCartItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  size: z.string().trim().min(1, "Size is required"),
  color: z.string().trim().min(1, "Color is required"),
});

export const mergeCartSchema = z.object({
  sessionId: z.string().trim().min(1, "sessionId is required"),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type RemoveCartItemInput = z.infer<typeof removeCartItemSchema>;
export type MergeCartInput = z.infer<typeof mergeCartSchema>;