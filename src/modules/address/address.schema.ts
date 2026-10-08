import { z } from "zod";

export const createAddressSchema = z.object({
  firstName: z
    .string({ message: "firstName is required" })
    .trim()
    .min(1, "firstName cannot be empty"),
  lastName: z.string().trim().optional(),
  addressLine1: z
    .string({ message: "addressLine1 is required" })
    .trim()
    .min(3, "addressLine1 must be at least 3 characters"),
  addressLine2: z.string().trim().optional(),
  pincode: z
    .string({ message: "pincode is required" })
    .trim()
    .min(3, "pincode is required"),
  state: z
    .string({ message: "state is required" })
    .trim()
    .min(2, "state is required"),
  country: z.string().trim().default("India"),
  deliveryInstruction: z.string().trim().optional(),
  isPrimary: z.boolean().default(false),
});

export const addressIdParamSchema = z.object({
  addressId: z.string().uuid("Invalid address ID format. Must be a valid UUID"),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type AddressIdParam = z.infer<typeof addressIdParamSchema>;