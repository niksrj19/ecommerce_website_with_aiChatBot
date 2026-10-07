import { SearchHit } from "../search.types";

export class RRFRanker {
  static rank(
    keywordHits: SearchHit[],
    semanticHits: SearchHit[],
    k: number = 60
  ): SearchHit[] {
    const scoreMap = new Map<string, { hit: SearchHit; rrfScore: number }>();

    // Process Keyword Ranks
    keywordHits.forEach((hit, rank) => {
      const current = scoreMap.get(hit.id) || { hit, rrfScore: 0 };
      current.rrfScore += 1 / (k + (rank + 1));
      scoreMap.set(hit.id, current);
    });

    // Process Semantic Ranks
    semanticHits.forEach((hit, rank) => {
      const current = scoreMap.get(hit.id) || { hit, rrfScore: 0 };
      current.rrfScore += 1 / (k + (rank + 1));
      scoreMap.set(hit.id, current);
    });

    return Array.from(scoreMap.values())
      .map(({ hit, rrfScore }) => ({
        ...hit,
        score: rrfScore,
      }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }
}