import { db } from "../../../core/database";
import { EmbeddingService } from "./embedding.service";
import { MetadataFilter } from "./metadata-filter";

export interface RetrievedChunk {
  id: string;
  title: string;
  content: string;
  department: string;
  score: number;
}

export class VectorStore {
  static async searchKnowledge(query: string, userRole = "USER", limit = 4): Promise<RetrievedChunk[]> {
    const allowedRoles = MetadataFilter.getRoleClearanceFilter(userRole);
    const embedding = await EmbeddingService.getEmbedding(query);
    const vectorString = `[${embedding.join(",")}]`;
    const sanitized = query.replace(/['"&|!]/g, " ").trim();

    const results = await db.$queryRaw<any[]>`
      SELECT 
        kd.id, kd.title, kd.content, kd.department,
        (
          ts_rank_cd(kd.search_vector, websearch_to_tsquery('english', ${sanitized})) * 0.4 +
          (1 - (kd.embedding <=> ${vectorString}::vector)) * 0.6
        ) AS rank_score
      FROM "knowledge_documents" kd
      WHERE 
        kd.min_role = ANY(${allowedRoles}::"Role"[])
        AND (
          kd.embedding IS NOT NULL 
          OR kd.search_vector @@ websearch_to_tsquery('english', ${sanitized})
        )
      ORDER BY rank_score DESC
      LIMIT ${limit};
    `;

    return results.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      department: r.department,
      score: Number(r.rank_score),
    }));
  }
}