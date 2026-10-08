// src/core/redis/semantic-cache.ts
import { redis } from "./client";
import { SemanticSearchStrategy } from "../../modules/search/strategies/semantic-search";

interface CachedSemanticEntry {
  prompt: string;
  response: string;
  embedding: number[];
  metadata?: Record<string, any>;
  createdAt: number;
}

export class SemanticCache {
  private static PREFIX = "semcache:entries";
  private static SIMILARITY_THRESHOLD = 0.92; // 92% similarity required for a hit
  private static CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

  /**
   * Computes Cosine Similarity between two normalized vectors
   */
  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Checks the semantic cache for a matching prompt
   */
  static async get(prompt: string): Promise<{ response: string; similarity: number } | null> {
    try {
      const queryEmbedding = await SemanticSearchStrategy.generateEmbedding(prompt);

      // Fetch active cache index keys
      const keys = await redis.keys(`${this.PREFIX}:*`);
      if (keys.length === 0) return null;

      // Pipeline fetch all cached entries
      const pipeline = redis.pipeline();
      keys.forEach((key) => pipeline.get(key));
      const results = await pipeline.exec();

      let bestMatch: { response: string; similarity: number } | null = null;
      let highestSimilarity = 0;

      for (const [, rawValue] of results || []) {
        if (!rawValue) continue;
        const entry: CachedSemanticEntry = JSON.parse(rawValue as string);

        const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);

        if (similarity >= this.SIMILARITY_THRESHOLD && similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatch = {
            response: entry.response,
            similarity,
          };
        }
      }

      return bestMatch;
    } catch (err: any) {
      console.warn("Semantic cache lookup failed, falling back to LLM:", err.message);
      return null;
    }
  }

  /**
   * Stores a new prompt-response pair along with its vector embedding
   */
  static async set(
    prompt: string,
    response: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const embedding = await SemanticSearchStrategy.generateEmbedding(prompt);
      const cacheId = Math.random().toString(36).substring(2, 12);
      const key = `${this.PREFIX}:${cacheId}`;

      const payload: CachedSemanticEntry = {
        prompt,
        response,
        embedding,
        metadata,
        createdAt: Date.now(),
      };

      await redis.set(key, JSON.stringify(payload), "EX", this.CACHE_TTL_SECONDS);
    } catch (err: any) {
      console.error("Failed to write to semantic cache:", err.message);
    }
  }
}