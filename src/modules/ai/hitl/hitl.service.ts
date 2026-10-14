import { db } from "../../../core/database";
import { Prisma } from "@prisma/client";

export class HitlService {
  static async createApprovalTask(data: {
    userId: string;
    sessionId: string;
    actionType: string;
    amount?: number;
    payload: any;
  }) {
    const task = await db.hitlApproval.create({
      data: {
        userId: data.userId,
        sessionId: data.sessionId,
        actionType: data.actionType,
        amount: data.amount !== undefined ? new Prisma.Decimal(data.amount) : null,
        payload: data.payload,
        status: "PENDING",
      },
    });

    return task;
  }

  static async resolveApproval(approvalId: string, status: "APPROVED" | "REJECTED", reviewerId: string, reason?: string) {
    return db.hitlApproval.update({
      where: { id: approvalId },
      data: {
        status,
        reviewedBy: reviewerId,
        rejectionReason: reason,
      },
    });
  }
}