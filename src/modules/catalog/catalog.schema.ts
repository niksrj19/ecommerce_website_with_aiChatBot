// src/modules/catalog/catalog.schema.ts
import { z } from "zod";

// Helper to normalize strings or comma-separated strings into string arrays
const stringToArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val;
    return val
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  });

export const getProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  size: stringToArray,
  color: stringToArray,
  category: stringToArray,
  brand: stringToArray,
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
});

export type GetProductsQuery = z.infer<typeof getProductsQuerySchema>;



// Create Product Schema
export const createProductSchema = z.object({
  title: z
    .string({ message: "Title is required" })
    .trim()
    .min(3, "Title must be at least 3 characters long"),
  description: z
    .string({ message: "Description is required" })
    .trim()
    .min(10, "Description must be at least 10 characters long"),
  brand: z
    .string({ message: "Brand is required" })
    .trim()
    .min(1, "Brand cannot be empty"),
  category: z
    .string({ message: "Category is required" })
    .trim()
    .min(1, "Category cannot be empty"),
  price: z
    .number({ message: "Price is required" })
    .positive("Price must be a positive number"),
  imageUrl: z
    .string({ message: "Primary image URL is required" })
    .url("Primary imageUrl must be a valid URL"),
  sizes: z
    .array(z.string().trim().min(1))
    .nonempty("At least one size must be specified"),
  colors: z
    .array(z.string().trim().min(1))
    .nonempty("At least one color must be specified"),
  inStock: z.boolean().default(true),
  galleryImages: z
    .array(
      z.object({
        url: z.string().url("Gallery image must be a valid URL"),
        altText: z.string().trim().optional(),
      })
    )
    .optional()
    .default([]),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;


// Param validation for product ID (UUID)
export const productIdParamSchema = z.object({
  id: z.string().uuid("Invalid product ID format. Must be a valid UUID"),
});

// Partial update schema
export const updateProductSchema = createProductSchema
  .partial()
  .extend({
    // Optional flag to control whether gallery images are replaced or appended
    replaceGallery: z.boolean().optional().default(false),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update the product",
  });

  export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductIdParam = z.infer<typeof productIdParamSchema>;

