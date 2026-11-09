import Groq from "groq-sdk";
import { Response } from "express";
import { AGENT_TOOLS, AGENT_TOOL_DEFINITIONS } from "../tools/registry.js";
import { MemoryService } from "./memory.service.js";
import { StreamService } from "./stream.service.js";
import { env } from "../../../config/env.js";
import { ChatCompletionMessageParam } from "groq-sdk/resources/chat/index.js";
import { InputGuardrail } from "../guardrails/input.guardrail.js";
import { OutputGuardrail } from "../guardrails/output.guardrail.js";
import { toRecentTurns } from "../guardrails/guardrail.llm.js";

const groqAi = new Groq({ apiKey: env.GROQ_API_KEY });
const frontendUrl = env.CLIENT_URL.replace(/\/+$/, "");

const SYSTEM_PROMPT = `You are Aegis, the enterprise AI Customer Support Assistant for AegisCommerce.
Your capabilities:
1. Lookup and track orders.
2. Search products, inspect carts, manage items, and clear the cart when explicitly requested.
3. Answer store policies, returns, and warranties using internal runbooks.
4. Process cancellations and refunds (refunds over $50 pause for human manager approval).
5. If you cannot resolve an inquiry, escalate with official helpline (1800-AEGIS-HELP) and email (support@aegiscommerce.com).
Only help with AegisCommerce topics. For anything unrelated, politely say you can only help with the store.
Always provide concise, helpful, and polite answers.

CART SAFETY:
- Use 'clear_cart' only when the user explicitly asks to clear or empty their entire cart.
- Do not use 'clear_cart' for requests to remove a single item or when the user's intent is ambiguous; clarify first.
- When calling 'clear_cart', set userConfirmed to true only for that explicit request.

CRITICAL UI INSTRUCTIONS FOR ORDERS:
- When a user asks about their orders and you use 'get_order_status', DO NOT generate markdown tables.
- Keep your conversational response brief and friendly (e.g., "I found your recent orders! You can view their full status and tracking details here.").
- Always include an absolute markdown link on the frontend domain ${frontendUrl}: [View Orders Dashboard](${frontendUrl}/orders) or [View Order](${frontendUrl}/orders/{actualOrderId}). Use the actual order ID returned by the tool in the URL, without braces.
- Never clutter the chat window with tabular data.
CRITICAL UI INSTRUCTIONS FOR SHOP:
- When a user asks about product search and you use 'search_catalog', DO NOT generate markdown tables.
- Always include an absolute markdown link to the shop: [Show Product Listing Page](${frontendUrl}/shop) or [View Product](${frontendUrl}/shop/{actualProductId}). Use the actual product ID returned by the tool, without braces.
- Never clutter the chat window with tabular data.
`;

const CHAT_ERROR_RESPONSE =
  "Sorry, I'm having trouble responding right now. Please try again in a moment.";
const EMPTY_ANSWER_RESPONSE =
  "Sorry, I couldn't put together an answer for that. Could you rephrase, or contact 1800-AEGIS-HELP / support@aegiscommerce.com?";

export class AgentService {
  static async runStream(
    sessionId: string,
    userPrompt: string,
    context: { userId?: string; userRole?: string },
    res: Response
  ): Promise<void> {
    StreamService.initSSE(res);
    try {
      const history = await MemoryService.getHistory(sessionId);

      const greetingResponse = InputGuardrail.getGreetingResponse(userPrompt);
      if (greetingResponse) {
        await MemoryService.appendMessage(sessionId, { role: "user", content: userPrompt });
        await MemoryService.appendMessage(sessionId, { role: "assistant", content: greetingResponse });
        StreamService.emitToken(res, greetingResponse);
        StreamService.emitEnd(res);
        return;
      }

      if (!(await InputGuardrail.isInScope(userPrompt, history))) {
        StreamService.emitToken(res, InputGuardrail.OUT_OF_SCOPE_RESPONSE);
        StreamService.emitEnd(res);
        return;
      }

      const userMessage: ChatCompletionMessageParam = { role: "user", content: userPrompt };
      await MemoryService.appendMessage(sessionId, userMessage);

      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        userMessage,
      ];

      const toolsUsed: string[] = [];
      let finalAnswer: string | null = null;
      const MAX_LOOPS = 5;

      for (let loop = 0; loop < MAX_LOOPS; loop++) {
        const responseStream = await groqAi.chat.completions.create({
          model: env.GROQ_MODEL,
          messages,
          tools: AGENT_TOOL_DEFINITIONS,
          stream: true,
        });

        let accumulatedContent = "";
        const toolCallsAcc: any[] = [];

        for await (const chunk of responseStream) {
          const delta: any = chunk.choices[0]?.delta;
          if (!delta) continue;

          // Reasoning text is ignored, but do NOT `continue` here: a chunk that
          // carries reasoning can also carry content or tool_calls.
          if (delta.content) {
            accumulatedContent += delta.content;
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (!toolCallsAcc[tc.index]) {
                toolCallsAcc[tc.index] = { id: tc.id, function: { name: "", arguments: "" } };
              }
              if (tc.id) toolCallsAcc[tc.index].id = tc.id;
              if (tc.function?.name) toolCallsAcc[tc.index].function.name += tc.function.name;
              if (tc.function?.arguments) toolCallsAcc[tc.index].function.arguments += tc.function.arguments;
            }
          }
        }

        const toolCalls = toolCallsAcc.filter(Boolean);

        // No tool calls → this is the final answer.
        if (toolCalls.length === 0) {
          finalAnswer = accumulatedContent;
          break;
        }

        messages.push({
          role: "assistant",
          content: accumulatedContent || null,
          tool_calls: toolCalls.map((t) => ({ id: t.id, type: "function", function: t.function })),
        } as ChatCompletionMessageParam);

        for (const tc of toolCalls) {
          const tool = AGENT_TOOLS[tc.function.name];
          StreamService.emitToolCall(res, tc.function.name, tc.function.arguments);
          toolsUsed.push(tc.function.name);

          let toolOutput = "Tool not found.";
          let toolExecutedSuccessfully = false;
          if (tool) {
            try {
              const parsedArgs = JSON.parse(tc.function.arguments || "{}");
              toolOutput = await tool.execute(parsedArgs, {
                userId: context.userId,
                sessionId,
                userRole: context.userRole,
              });
              toolExecutedSuccessfully = true;
            } catch (err: any) {
              toolOutput = `Error executing tool ${tc.function.name}: ${err.message}`;
            }
          }

          if (toolExecutedSuccessfully && tc.function.name === "clear_cart") {
            StreamService.emitCartUpdated(res);
          }

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: typeof toolOutput === "string" ? toolOutput : JSON.stringify(toolOutput),
          });
        }
      }

      // Previously: an empty model reply went to the output guardrail and came
      // back as "blocked", and hitting MAX_LOOPS emitted nothing at all.
      let answer: string;
      if (!finalAnswer || !finalAnswer.trim()) {
        console.warn("[agent] empty final answer", { sessionId, toolsUsed });
        answer = EMPTY_ANSWER_RESPONSE;
      } else {
        const allowed = await OutputGuardrail.isAllowed({
          userPrompt,
          answer: finalAnswer,
          recentConversation: toRecentTurns(history as any, 4),
          toolsUsed,
        });
        answer = allowed ? finalAnswer : OutputGuardrail.BLOCKED_RESPONSE;
      }

      await MemoryService.appendMessage(sessionId, { role: "assistant", content: answer });
      StreamService.emitToken(res, answer);
      StreamService.emitEnd(res);
    } catch (error: any) {
      console.error("Agent Loop Error:", error);
      if (!res.writableEnded) {
        StreamService.emitToken(res, CHAT_ERROR_RESPONSE);
        StreamService.emitEnd(res);
      }
    }
  }
}