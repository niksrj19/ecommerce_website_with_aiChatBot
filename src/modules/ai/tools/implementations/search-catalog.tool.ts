import { z } from "zod";
import { SearchService } from "../../../search/search.service";
import { ToolGuardrails } from "../guardrails";

export const searchCatalogSchema = z.object({
  query: z.string().describe("Search query for products"),
  category: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
});

export const searchCatalogTool = {
  name: "search_catalog",
  description: "Search for store products, shoes, and merchandise",
  schema: searchCatalogSchema,
  execute: async (args: z.infer<typeof searchCatalogSchema>) => {
    const cleanArgs = ToolGuardrails.validateInput(searchCatalogSchema, args);
    const results = await SearchService.search({
        q: cleanArgs.query,
        category: cleanArgs.category ? [cleanArgs.category] : undefined,
        minPrice: cleanArgs.minPrice,
        maxPrice: cleanArgs.maxPrice,
        page: 1,
        limit: 5,
        sortBy: "relevance",
        brand: undefined,
        inStock: undefined
    });
    return ToolGuardrails.sanitizeOutput(results.hits);
  },
};