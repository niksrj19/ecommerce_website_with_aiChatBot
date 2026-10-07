import crypto from "crypto";
// import { redis } from "../../core/redis/client";
import { SearchQueryParams } from "./search.schema";
import { SearchResponse, SearchHit } from "./search.types";
import { HybridSearchStrategy } from "./strategies/hybrid-search";
import { RRFRanker } from "./ranking/rrf.ranker";
import { BusinessBooster } from "./ranking/booster";
import { FacetBuilder } from "./aggregations/facet.builder";
import { db } from "../../core/database";

export class SearchService {
  private static CACHE_TTL_SECONDS = 600; // 10 minutes

  static async search(params: SearchQueryParams): Promise<SearchResponse> {
    const startTime = performance.now();

    // 1. Generate Deterministic Cache Key
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(params))
      .digest("hex");
    const cacheKey = `search:${hash}`;

    // 2. Intercept Cache Hit
    // const cachedData = await redis.get(cacheKey);
    // if (cachedData) {
    //   const response: SearchResponse = JSON.parse(cachedData);
    //   response.performance = {
    //     tookMs: Math.round(performance.now() - startTime),
    //     cached: true,
    //   };
    //   return response;
    // }

    let candidateHits: SearchHit[] = [];

    // 3. Execution Pipeline: Hybrid Search or Database Query
    if (params.q) {
      const { keywordHits, semanticHits } = await HybridSearchStrategy.execute(params, 80);
      const fusedHits = RRFRanker.rank(keywordHits, semanticHits);
      candidateHits = BusinessBooster.apply(fusedHits);
    } else {
      // Fallback if no search query provided: standard database catalog list
      const rows = await db.product.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
      });
      candidateHits = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        brand: r.brand,
        category: r.category,
        price: Number(r.price),
        imageUrl: r.imageUrl,
        inStock: r.inStock,
        salesCount: r.salesCount,
        isFeatured: r.isFeatured,
      }));
    }

    // 4. Apply Filters (Brand, Category, Price, Stock)
    let filtered = candidateHits.filter((item) => {
      if (params.brand && params.brand.length > 0) {
        if (!params.brand.map((b) => b.toLowerCase()).includes(item.brand.toLowerCase())) return false;
      }
      if (params.category && params.category.length > 0) {
        if (!params.category.map((c) => c.toLowerCase()).includes(item.category.toLowerCase())) return false;
      }
      if (params.minPrice !== undefined && item.price < params.minPrice) return false;
      if (params.maxPrice !== undefined && item.price > params.maxPrice) return false;
      if (params.inStock !== undefined && item.inStock !== params.inStock) return false;
      return true;
    });

    // 5. Apply Sorting
    if (params.sortBy === "price_asc") filtered.sort((a, b) => a.price - b.price);
    else if (params.sortBy === "price_desc") filtered.sort((a, b) => b.price - a.price);

    // 6. Build Facets for all matching results
    const matchingIds = filtered.map((h) => h.id);
    const facets = await FacetBuilder.build(matchingIds);

    // 7. Paginate Slices
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / params.limit);
    const offset = (params.page - 1) * params.limit;
    const paginatedHits = filtered.slice(offset, offset + params.limit);

    const response: SearchResponse = {
      hits: paginatedHits,
      facets,
      pagination: {
        totalItems,
        totalPages,
        currentPage: params.page,
        limit: params.limit,
      },
      performance: {
        tookMs: Math.round(performance.now() - startTime),
        cached: false,
      },
    };

    // 8. Cache response asynchronously
    // await redis.set(cacheKey, JSON.stringify(response), "EX", this.CACHE_TTL_SECONDS);

    return response;
  }
}