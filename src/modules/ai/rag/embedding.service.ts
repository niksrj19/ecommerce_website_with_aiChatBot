
import { GoogleGenAI } from '@google/genai';
import { env } from '../../../config/env';
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });


export class EmbeddingService {
  static async getEmbedding(text: string): Promise<number[]> {
    const res = await ai.models.embedContent({
      model: env.GEMINI_API_MODEL,
      contents: text.replace(/\n/g, " "),
    });
    const values = res?.embeddings?.[0]?.values;
    if (!values) {
      throw new Error('Failed to generate embedding');
    }
    return values;
  }
}