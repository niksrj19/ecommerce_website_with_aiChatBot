import { redis } from "../../../core/redis/client";
// import { ChatCompletionMessageParam } from "openai/resources/chat";
import { ChatCompletionMessageParam } from "groq-sdk/resources/chat/index.js";

export class MemoryService {
  private static TTL = 7 * 24 * 60 * 60; // 7 days

  static async getHistory(sessionId: string, maxMessages = 10): Promise<ChatCompletionMessageParam[]> {
    const key = `chat:history:${sessionId}`;
    const raw = await redis.lrange(key, -maxMessages, -1);
    return raw.map((item) => JSON.parse(item));
  }

  static async appendMessage(sessionId: string, message: ChatCompletionMessageParam): Promise<void> {
    const key = `chat:history:${sessionId}`;
    await redis
      .pipeline()
      .rpush(key, JSON.stringify(message))
      .ltrim(key, -20, -1) // Retain only the last 20 messages
      .expire(key, this.TTL)
      .exec();
  }
}