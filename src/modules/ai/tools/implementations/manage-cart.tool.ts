import { z } from "zod";
import { CartService } from "../../../cart/cart.service";
import { ToolGuardrails } from "../guardrails";

export const manageCartSchema = z.object({
  action: z.enum(["get", "add", "remove"]),
  productId: z.string().uuid().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  quantity: z.number().int().positive().optional(),
});

export const manageCartTool = {
  name: "manage_cart",
  description: "Inspect or modify the customer's shopping cart items",
  schema: manageCartSchema,
  execute: async (args: z.infer<typeof manageCartSchema>, context: { userId?: string; sessionId: string }) => {
    const target = { userId: context.userId, sessionId: context.sessionId };
    const validated = ToolGuardrails.validateInput(manageCartSchema, args);

    if (validated.action === "get") {
      const cart = await CartService.getCart(target);
      return ToolGuardrails.sanitizeOutput(cart);
    }

    if (validated.action === "add" && validated.productId && validated.size && validated.color) {
      const cart = await CartService.addItem(target, {
        productId: validated.productId,
        size: validated.size,
        color: validated.color,
        quantity: validated.quantity || 1,
      });
      return ToolGuardrails.sanitizeOutput(cart);
    }

    if (validated.action === "remove" && validated.productId && validated.size && validated.color) {
      const cart = await CartService.removeItem(target, {
        productId: validated.productId,
        size: validated.size,
        color: validated.color,
      });
      return ToolGuardrails.sanitizeOutput(cart);
    }

    return "Missing required parameters for cart operation.";
  },
};