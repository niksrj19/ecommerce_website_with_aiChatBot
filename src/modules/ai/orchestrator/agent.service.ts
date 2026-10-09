// import OpenAI from "openai";
import Groq from "groq-sdk";
import { Response } from "express";
import { AGENT_TOOLS, AGENT_TOOL_DEFINITIONS } from "../tools/registry";
import { MemoryService } from "./memory.service";
import { StreamService } from "./stream.service";
// import { ChatCompletionMessageParam } from "openai/resources/chat";
import { env } from "../../../config/env";
import { ChatCompletionMessageParam } from "groq-sdk/resources/chat/index.js";

const groqAi = new Groq({ apiKey: env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Aegis, the enterprise AI Customer Support Assistant for AegisCommerce.
Your capabilities:
1. Lookup and track orders.
2. Search products, inspect carts, and manage items.
3. Answer store policies, returns, and warranties using internal runbooks.
4. Process cancellations and refunds (refunds over $50 pause for human manager approval).
5. If you cannot resolve an inquiry, escalate with official helpline (1800-AEGIS-HELP) and email (support@aegiscommerce.com).
Always provide concise, helpful, and polite answers.`;


export async function getGroqChatCompletion() {
  return groqAi.chat.completions.create({
    messages: [
      {
        role: "user",
        content: "Explain the importance of fast language models",
      },
    ],
    model: env.GROQ_MODEL,
  });
}

export class AgentService {
  
  static async runStream(
    sessionId: string,
    userPrompt: string,
    context: { userId?: string; userRole?: string },
    res: Response
  ): Promise<void> {
    StreamService.initSSE(res);

    console.log("Starting agent loop with context:", { sessionId, userPrompt, context });

    try {
      const history = await MemoryService.getHistory(sessionId);
      const userMessage: ChatCompletionMessageParam = { role: "user", content: userPrompt };
      await MemoryService.appendMessage(sessionId, userMessage);
      
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        userMessage,
      ];

      console.log("Constructed messages for Groq API:", messages);
      console.log("Available tools for agent:", Object.keys(AGENT_TOOLS));

      let loopCount = 0;
      const MAX_LOOPS = 5;

      while (loopCount < MAX_LOOPS) {
        loopCount++;

        const responseStream = await groqAi.chat.completions.create({
          model: env.GROQ_MODEL,
          messages,
          tools: AGENT_TOOL_DEFINITIONS,
          stream: true,
        });

        let accumulatedContent = "";
        let toolCallsAcc: any[] = [];

        for await (const chunk of responseStream) {
          const delta = chunk.choices[0]?.delta;

          console.log("Received chunk from Groq API:", delta);

          // Stream text tokens to frontend
          if (delta?.content) {
            accumulatedContent += delta.content;
            StreamService.emitToken(res, delta.content);
          }

          // Accumulate tool calls if triggered by the model
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (!toolCallsAcc[tc.index]) {
                toolCallsAcc[tc.index] = { id: tc.id, function: { name: "", arguments: "" } };
              }
              if (tc.function?.name) toolCallsAcc[tc.index].function.name += tc.function.name;
              if (tc.function?.arguments) toolCallsAcc[tc.index].function.arguments += tc.function.arguments;
            }
          }
        }

        // If no tools requested, assistant message is finalized
        if (toolCallsAcc.length === 0) {
          await MemoryService.appendMessage(sessionId, { role: "assistant", content: accumulatedContent });
          break;
        }

        // Handle tool calls
        messages.push({
          role: "assistant",
          content: accumulatedContent || null,
          tool_calls: toolCallsAcc.map((t) => ({
            id: t.id,
            type: "function",
            function: t.function,
          })),
        });

        for (const tc of toolCallsAcc) {
          const tool = AGENT_TOOLS[tc.function.name];
          StreamService.emitToolCall(res, tc.function.name, tc.function.arguments);

          let toolOutput = "Tool not found.";
          if (tool) {
            try {
              const parsedArgs = JSON.parse(tc.function.arguments || "{}");
              toolOutput = await tool.execute(parsedArgs, {
                userId: context.userId,
                sessionId,
                userRole: context.userRole,
              });
            } catch (err: any) {
              toolOutput = `Error executing tool ${tc.function.name}: ${err.message}`;
            }
          }

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: toolOutput,
          });
        }
      }

      StreamService.emitEnd(res);
    } catch (error: any) {
      console.error("Agent Loop Error:", error);
      StreamService.emitError(res, error.message || "Failed to process chat request.");
    }
  }
}