import { db } from "../../../core/database";
import { FacetResult } from "../search.types";

export class FacetBuilder {
  static async build(matchingProductIds: string[]): Promise<FacetResult> {
    if (matchingProductIds.length === 0) {
      return {
        brands: [],
        categories: [],
        priceStats: { min: 0, max: 0, avg: 0 },
        priceRanges: [],
        availability: { inStock: 0, outOfStock: 0 },
      };
    }

    const [brandCounts, catCounts, priceStatsRaw, availabilityRaw] = await Promise.all([
      db.$queryRaw<{ brand: string; count: bigint }[]>`
        SELECT brand, count(*)::bigint AS count
        FROM "products"
        WHERE id = ANY(${matchingProductIds})
        GROUP BY brand
        ORDER BY count DESC
        LIMIT 20;
      `,
      db.$queryRaw<{ category: string; count: bigint }[]>`
        SELECT category, count(*)::bigint AS count
        FROM "products"
        WHERE id = ANY(${matchingProductIds})
        GROUP BY category
        ORDER BY count DESC
        LIMIT 20;
      `,
      db.$queryRaw<{ min: number; max: number; avg: number }[]>`
        SELECT 
          coalesce(min(price::float), 0) AS min,
          coalesce(max(price::float), 0) AS max,
          coalesce(avg(price::float), 0) AS avg
        FROM "products"
        WHERE id = ANY(${matchingProductIds});
      `,
      db.$queryRaw<{ in_stock: boolean; count: bigint }[]>`
        SELECT in_stock, count(*)::bigint AS count
        FROM "products"
        WHERE id = ANY(${matchingProductIds})
        GROUP BY in_stock;
      `,
    ]);

    // Build Price Bins dynamically
    const min = priceStatsRaw[0]?.min || 0;
    const max = priceStatsRaw[0]?.max || 0;
    const step = (max - min) / 4 || 50;

    const priceRanges = [
      { range: `$${min.toFixed(0)} - $${(min + step).toFixed(0)}`, min, max: min + step, count: 0 },
      { range: `$${(min + step).toFixed(0)} - $${(min + step * 2).toFixed(0)}`, min: min + step, max: min + step * 2, count: 0 },
      { range: `$${(min + step * 2).toFixed(0)} - $${(min + step * 3).toFixed(0)}`, min: min + step * 2, max: min + step * 3, count: 0 },
      { range: `$${(min + step * 3).toFixed(0)}+`, min: min + step * 3, max: Infinity, count: 0 },
    ];

    let inStock = 0;
    let outOfStock = 0;
    availabilityRaw.forEach((row) => {
      if (row.in_stock) inStock = Number(row.count);
      else outOfStock = Number(row.count);
    });

    return {
      brands: brandCounts.map((b) => ({ name: b.brand, count: Number(b.count) })),
      categories: catCounts.map((c) => ({ name: c.category, count: Number(c.count) })),
      priceStats: {
        min: Number(priceStatsRaw[0]?.min || 0),
        max: Number(priceStatsRaw[0]?.max || 0),
        avg: Math.round(Number(priceStatsRaw[0]?.avg || 0)),
      },
      priceRanges,
      availability: { inStock, outOfStock },
    };
  }
}