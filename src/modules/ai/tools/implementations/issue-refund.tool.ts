import { z } from "zod";
import { HitlService } from "../../hitl/hitl.service";
import { ToolGuardrails } from "../guardrails";

export const issueRefundSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(5),
});

export const issueRefundTool = {
  name: "issue_refund",
  description: "Process a customer refund for an order. High amounts ($50+) require manager HITL approval.",
  schema: issueRefundSchema,
  execute: async (
    args: z.infer<typeof issueRefundSchema>,
    context: { userId?: string; sessionId: string; userRole?: string }
  ) => {
    if (!context.userId) return "Authentication required to request a refund.";

    const input = ToolGuardrails.validateInput(issueRefundSchema, args);

    // Rule: Refunds over $50 trigger Human-in-the-Loop review
    if (input.amount > 50) {
      const approval = await HitlService.createApprovalTask({
        userId: context.userId,
        sessionId: context.sessionId,
        actionType: "ISSUE_REFUND",
        amount: input.amount,
        payload: input,
      });

      return JSON.stringify({
        status: "HITL_PAUSED",
        approvalId: approval.id,
        message: `Refund of $${input.amount} exceeds automated threshold ($50). Request forwarded to human manager for approval. Approval ID: ${approval.id}`,
      });
    }

    return JSON.stringify({
      status: "COMPLETED",
      message: `Refund of $${input.amount} for Order ${input.orderId} processed successfully.`,
    });
  },
};