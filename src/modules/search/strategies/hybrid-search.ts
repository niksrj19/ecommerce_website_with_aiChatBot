import { KeywordSearchStrategy } from "./keyword-search";
import { SemanticSearchStrategy } from "./semantic-search";
import { SearchQueryParams } from "../search.schema";
import { SearchHit } from "../search.types";

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

    console.log("Keyword Hits:", keywordHits);
    console.log("Semantic Hits:", semanticHits);
    return { keywordHits, semanticHits };
  }
}