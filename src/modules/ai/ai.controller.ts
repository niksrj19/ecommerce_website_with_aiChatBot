import { Request, Response } from "express";
import { AgentService } from "./orchestrator/agent.service";
import { HitlService } from "./hitl/hitl.service";
import { z } from "zod";

const chatStreamSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt cannot be empty"),
  sessionId: z.string().trim().min(1, "Session ID is required"),
});

export class AIController {
  // POST /api/ai/chat/stream
  static async chatStream(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, sessionId } = chatStreamSchema.parse(req.body);

      console.log("Received chat stream request:", { prompt, sessionId, userId: req.user?.userId });

      await AgentService.runStream(
        sessionId,
        prompt,
        {
          userId: req.user?.userId,
          userRole: req.user?.role,
        },
        res
      );
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // POST /api/ai/hitl/approve (Admin/Manager)
  static async resolveApproval(req: Request, res: Response): Promise<void> {
    try {
      const { approvalId, status, reason } = req.body;
      const result = await HitlService.resolveApproval(
        approvalId,
        status,
        req.user?.userId || "SYSTEM",
        reason
      );
      res.status(200).json({ message: `Task ${status.toLowerCase()} successfully`, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}