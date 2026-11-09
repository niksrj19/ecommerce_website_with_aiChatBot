import Groq from "groq-sdk";
import { env } from "../../../config/env.js";

const groqAi = new Groq({ apiKey: env.GROQ_API_KEY });

/**
 * Model used for the cheap yes/no classification calls.
 * Set GUARDRAIL_MODEL to a small non-reasoning model (e.g. llama-3.1-8b-instant)
 * if you have one available; otherwise it falls back to GROQ_MODEL.
 */
export const GUARDRAIL_MODEL = process.env.GUARDRAIL_MODEL || env.GROQ_MODEL;

/**
 * Reasoning models spend tokens "thinking" before they answer. With a small
 * max_tokens the budget runs out mid-thought and message.content comes back
 * empty, which is what made both guardrails fail on valid queries.
 * These params keep reasoning short/hidden so the label always lands in content.
 */
function reasoningParams(model: string): Record<string, unknown> {
  const m = model.toLowerCase();
  if (m.includes("gpt-oss")) {
    return { reasoning_effort: "low", include_reasoning: false };
  }
  if (m.includes("qwen")) {
    return { reasoning_effort: "none" };
  }
  if (m.includes("deepseek") || m.includes("r1")) {
    return { reasoning_format: "hidden" };
  }
  return {};
}

/**
 * Asks the model to pick one of `labels` and parses the reply tolerantly
 * ("IN_SCOPE.", "**ALLOW**", "<think>…</think> BLOCK" all work).
 * Returns null when the call fails or no label can be found, so callers
 * decide whether to fail open or closed instead of throwing.
 *
 * List labels so that no label is a substring of an earlier one.
 */
export async function classify<T extends string>(
  systemPrompt: string,
  payload: unknown,
  labels: readonly T[]
): Promise<T | null> {
  try {
    const response = await groqAi.chat.completions.create({
      model: GUARDRAIL_MODEL,
      temperature: 0,
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(payload) },
      ],
      ...reasoningParams(GUARDRAIL_MODEL),
    } as any);

    const raw = (response as any).choices?.[0]?.message?.content ?? "";
    const text = String(raw)
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .toUpperCase();

    for (const label of labels) {
      if (new RegExp(`\\b${label}\\b`).test(text)) {
        return label;
      }
    }

    console.warn("[guardrail] unparseable verdict:", JSON.stringify(raw).slice(0, 200));
    return null;
  } catch (err) {
    console.error("[guardrail] classification call failed:", err);
    return null;
  }
}

export type ChatTurn = { role: string; content: string };

/** Flattens history into plain user/assistant turns for the classifiers. */
export function toRecentTurns(history: Array<{ role: string; content?: unknown }>, limit = 6): ChatTurn[] {
  return history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-limit)
    .map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? ""),
    }));
}