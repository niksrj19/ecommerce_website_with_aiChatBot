import { KeywordSearchStrategy } from "./keyword-search.js";
import { SemanticSearchStrategy } from "./semantic-search.js";
import { SearchQueryParams } from "../search.schema.js";
import { SearchHit } from "../search.types.js";

export class HybridSearchStrategy {
  static async execute(query: SearchQueryParams, candidateLimit: number = 60): Promise<{
    keywordHits: SearchHit[];
    semanticHits: SearchHit[];
  }> {
    const [keywordHits, semanticHits] = await Promise.all([
      KeywordSearchStrategy.execute(query, candidateLimit),
      SemanticSearchStrategy.execute(query, candidateLimit),
    ]);

    debugger; // 👈 Debugging breakpoint to inspect keywordHits and semanticHits

   
    return { keywordHits, semanticHits };
  }
}