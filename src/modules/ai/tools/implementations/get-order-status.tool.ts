import { z } from "zod";
import { OrderService } from "../../../order/order.service";
import { ToolGuardrails } from "../guardrails";

export const getOrderStatusSchema = z.object({
  orderId: z
    .string()
    .optional()
    .describe("Optional specific order UUID to look up. Omit to fetch recent orders."),
});

export const getOrderStatusTool = {
  name: "get_order_status",
  description: "Retrieve order status, shipment tracking, or recent order history for the authenticated user",
  schema: getOrderStatusSchema,
  execute: async (args: z.infer<typeof getOrderStatusSchema>, context: { userId?: string }) => {
    if (!context.userId) {
      return "User is not logged in. Please ask the user to authenticate to view orders.";
    }

    const { orderId } = ToolGuardrails.validateInput(getOrderStatusSchema, args);
    const cleanOrderId = orderId?.trim();
    console.log('Tools called with ORder Id ===', cleanOrderId);
    if (cleanOrderId) {
      const order = await OrderService.getOrderById(cleanOrderId, context.userId);
      return ToolGuardrails.sanitizeOutput(order);
    }

    console.log("Order Id==", cleanOrderId);

    const pastOrders = await OrderService.getUserOrders(context.userId, 1, 5);
    return ToolGuardrails.sanitizeOutput(pastOrders);
  },
};