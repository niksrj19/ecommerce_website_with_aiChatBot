import { z } from "zod";
import { CartService } from "../../../cart/cart.service.js";
import { ToolGuardrails } from "../guardrails.js";

export const clearCartSchema = z.object({
  userConfirmed: z
    .literal(true)
    .describe("Set to true only when the user has explicitly asked to clear their entire cart."),
});

export const clearCartTool = {
  name: "clear_cart",
  description:
    "Remove every item from the customer's cart. Use only when the user explicitly asks to clear or empty the entire cart; never infer this from a request to remove one item.",
  schema: clearCartSchema,
  execute: async (
    args: z.infer<typeof clearCartSchema>,
    context: { userId?: string; sessionId: string }
  ) => {
    ToolGuardrails.validateInput(clearCartSchema, args);

    await CartService.clearCart({
      userId: context.userId,
      sessionId: context.sessionId,
    });

    return ToolGuardrails.sanitizeOutput({
      success: true,
      message: "Your cart has been cleared.",
    });
  },
};
