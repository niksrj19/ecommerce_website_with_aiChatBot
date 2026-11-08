import { Prisma } from "@prisma/client";
import { db } from "../../../core/database/index.js";
import { ChatCompletionMessageParam } from "groq-sdk/resources/chat/index.js";

export class MemoryService {
  private static MAX_MESSAGES = 20;
  private static TTL_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

  static async getHistory(sessionId: string, maxMessages = 10): Promise<ChatCompletionMessageParam[]> {
    const rows = await db.chatMessage.findMany({
      where: {
        sessionId,
        createdAt: { gte: new Date(Date.now() - this.TTL_MILLISECONDS) },
      },
      orderBy: { id: "desc" },
      take: maxMessages,
    });
    return rows.reverse().map((row) => JSON.parse(JSON.stringify(row.message)));
  }

  static async appendMessage(sessionId: string, message: ChatCompletionMessageParam): Promise<void> {
    const serialized = JSON.parse(JSON.stringify(message)) as Prisma.InputJsonValue;
    const cutoff = new Date(Date.now() - this.TTL_MILLISECONDS);
    await db.$transaction(async (tx) => {
      await tx.chatMessage.create({ data: { sessionId, message: serialized } });
      await tx.chatMessage.deleteMany({ where: { sessionId, createdAt: { lt: cutoff } } });
      const overflow = await tx.chatMessage.findMany({
        where: { sessionId },
        orderBy: { id: "desc" },
        skip: this.MAX_MESSAGES,
        select: { id: true },
      });
      if (overflow.length > 0) {
        await tx.chatMessage.deleteMany({
          where: { id: { in: overflow.map(({ id }) => id) } },
        });
      }
    });
  }
}