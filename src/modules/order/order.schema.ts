import { z } from "zod";

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  addressLine1: z.string().trim().min(3, "Address is required"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  postalCode: z.string().trim().min(3, "Postal code is required"),
  country: z.string().trim().min(2, "Country is required"),
  phoneNumber: z.string().trim().min(7, "Valid phone number is required"),
});

export const createOrderSchema = z.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.string().trim().min(2, "Payment method is required"),
});

export const orderPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const orderIdParamSchema = z.object({
  order_id: z.string().uuid("Invalid order ID format"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;