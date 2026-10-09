import { db } from "../../../core/database";
import { kafkaProducer } from "../../../core/kafka/producer";
import { KafkaTopic } from "../../../core/kafka/topics";
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
        amount: data.amount ? new Prisma.Decimal(data.amount) : null,
        payload: data.payload,
        status: "PENDING",
      },
    });

    // Publish event to Kafka
    await kafkaProducer.publish(KafkaTopic.AI_HITL_EVENTS, {
      type: "HITL_APPROVAL_REQUESTED",
      approvalId: task.id,
      userId: data.userId,
      actionType: data.actionType,
      amount: data.amount,
      payload: data.payload,
      createdAt: task.createdAt,
    });

    return task;
  }

  static async resolveApproval(approvalId: string, status: "APPROVED" | "REJECTED", reviewerId: string, reason?: string) {
    const updated = await db.hitlApproval.update({
      where: { id: approvalId },
      data: {
        status,
        reviewedBy: reviewerId,
        rejectionReason: reason,
      },
    });

    await kafkaProducer.publish(KafkaTopic.AI_HITL_EVENTS, {
      type: "HITL_APPROVAL_RESOLVED",
      approvalId,
      status,
      reviewerId,
      payload: updated.payload,
    });

    return updated;
  }
}