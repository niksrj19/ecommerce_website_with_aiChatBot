import { SearchHit } from "../search.types";

export class BusinessBooster {
  static apply(hits: SearchHit[]): SearchHit[] {
    return hits
      .map((hit) => {
        let multiplier = 1.0;

        // 1. Availability multiplier (penalize out-of-stock items)
        multiplier *= hit.inStock ? 1.2 : 0.6;

        // 2. Featured product boost
        if (hit.isFeatured) multiplier *= 1.25;

        // 3. Normalized popularity / sales velocity boost
        if (hit.salesCount > 100) multiplier *= 1.15;
        else if (hit.salesCount > 500) multiplier *= 1.3;

        return {
          ...hit,
          score: (hit.score || 0.01) * multiplier,
        };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }
}