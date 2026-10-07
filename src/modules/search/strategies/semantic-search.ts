// import OpenAI from "openai";
import { GoogleGenAI } from '@google/genai';
import { db } from "../../../core/database";
import { env } from "../../../config/env";
import { SearchHit } from "../search.types";
import { SearchQueryParams } from "../search.schema";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export class SemanticSearchStrategy {
//   static async generateEmbedding(text: string): Promise<number[]> {
//     const res = await openai.embeddings.create({
//       model: "text-embedding-3-small",
//       input: text.replace(/\n/g, " "),
//     });
//     return res.data[0].embedding;
//   }

   static async generateEmbedding(text: string): Promise<number[]> {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text.replace(/\n/g, " "),
      config: {
        outputDimensionality: 1536, // 👈 Truncates the 3072 vector to exactly 1536 dimensions
      }
      // Optional: Reduce dimensionality if you want to save storage space
      // config: { outputDimensionality: 768 } 
    });
    const embeddingValues = response?.embeddings?.[0]?.values;
    // 2. Add a runtime safety check to ensure TypeScript is satisfied 
  // and your app won't crash if the API behaves unexpectedly
  if (!embeddingValues) {
    throw new Error("Failed to generate embedding: No values returned from Gemini API.");
  }
    return embeddingValues // Assuming the first embedding is what you want
  }

  static async execute(query: SearchQueryParams, limit: number = 50): Promise<SearchHit[]> {
    if (!query.q) return [];

    const vector = await this.generateEmbedding(query.q);
    const vectorString = `[${vector.join(",")}]`;

    console.log("Generated embedding vector:", vectorString);

    const rawRows = await db.$queryRaw<any[]>`
      SELECT 
        p.id, p.title, p.description, p.brand, p.category, 
        p.price::float, p.image_url AS "imageUrl", p.in_stock AS "inStock",
        p.sales_count AS "salesCount", p.is_featured AS "isFeatured",
        (1 - (p.embedding <=> ${vectorString}::vector)) AS similarity_score
      FROM "products" p
      WHERE p.embedding IS NOT NULL
      ORDER BY p.embedding <=> ${vectorString}::vector ASC
      LIMIT ${limit};
    `;

    return rawRows.map((r) => ({
      ...r,
      score: Number(r.similarity_score),
    }));
  }
}