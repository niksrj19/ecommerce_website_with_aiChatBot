import { z } from "zod";
import { VectorStore } from "../../rag/vector-store";
import { ToolGuardrails } from "../guardrails";

export const queryRunbooksSchema = z.object({
  question: z.string().describe("User policy question regarding returns, shipping, warranty, or escalations"),
});

export const queryRunbooksTool = {
  name: "query_runbooks",
  description: "Search corporate policy runbooks, support FAQs, and return terms",
  schema: queryRunbooksSchema,
  execute: async (args: z.infer<typeof queryRunbooksSchema>, context: { userRole?: string }) => {
    const { question } = ToolGuardrails.validateInput(queryRunbooksSchema, args);
    const docs = await VectorStore.searchKnowledge(question, context.userRole || "USER", 3);
    return ToolGuardrails.sanitizeOutput(docs);
  },
};