import { z } from "zod";

const stringToArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val;
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  });

export const searchRequestSchema = z.object({
  q: z.string().trim().default(""),
  brand: stringToArray,
  category: stringToArray,
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === "true")),
  sortBy: z.enum(["relevance", "price_asc", "price_desc", "newest"]).default("relevance"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SearchQueryParams = z.infer<typeof searchRequestSchema>;