import { Prisma } from "@prisma/client";
import { db } from "../../../core/database";
import { SearchHit } from "../search.types";
import { SearchQueryParams } from "../search.schema";

export class KeywordSearchStrategy {
  static async execute(query: SearchQueryParams, limit: number = 50): Promise<SearchHit[]> {
    if (!query.q) return [];

    const sanitized = query.q.replace(/['"&|!]/g, " ").trim();
    if (!sanitized) return [];

    const rawRows = await db.$queryRaw<any[]>`
      SELECT 
        p.id, p.title, p.description, p.brand, p.category, 
        p.price::float, p.image_url AS "imageUrl", p.in_stock AS "inStock",
        p.sales_count AS "salesCount", p.is_featured AS "isFeatured",
        (
          ts_rank_cd(p.search_vector, websearch_to_tsquery('english', ${sanitized})) * 0.7 +
          similarity(p.title, ${sanitized}) * 0.3
        ) AS rank_score
      FROM "products" p
      WHERE 
        p.search_vector @@ websearch_to_tsquery('english', ${sanitized})
        OR p.title % ${sanitized}
      ORDER BY rank_score DESC
      LIMIT ${limit};
    `;

    return rawRows.map((r) => ({
      ...r,
      score: Number(r.rank_score),
    }));
  }
}