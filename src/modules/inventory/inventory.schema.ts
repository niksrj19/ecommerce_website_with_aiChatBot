// src/modules/inventory/inventory.schema.ts
import { z } from "zod";

export const createInventorySchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  categorySku: z.string().trim().min(1, "categorySku is required"),
  color: z.string().trim().optional(),
  size: z.string().trim().optional(),
  quantityInStock: z.number().int().nonnegative("quantityInStock must be >= 0").default(0),
  unitPrice: z.number().nonnegative("unitPrice must be >= 0"),
  reserved: z.number().int().nonnegative("reserved must be >= 0").default(0),
  storeId: z.string().trim().min(1, "storeId is required"),
});

export const updateInventorySchema = z.object({
  quantityDelta: z.number().int().optional(), // Atomic increment/decrement (e.g. +5, -2)
  quantityInStock: z.number().int().nonnegative().optional(), // Absolute override
  reservedDelta: z.number().int().optional(), // Atomic reservation changes
  reserved: z.number().int().nonnegative().optional(), // Absolute override
  unitPrice: z.number().nonnegative().optional(),
  color: z.string().trim().optional(),
  size: z.string().trim().optional(),
  storeId: z.string().trim().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

export type CreateInventoryInput = z.infer<typeof createInventorySchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;