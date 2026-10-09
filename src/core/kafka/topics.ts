// src/core/kafka/topics.ts
import type { Prisma } from "@prisma/client";

export enum KafkaTopic {
  // AI & HITL
  AI_HITL_EVENTS = "ai.hitl.events",
  AI_AGENT_AUDIT = "ai.agent.audit-trail",

  // Orders & Inventory
  ORDER_EVENTS = "order.events",
  INVENTORY_EVENTS = "inventory.events",

  // Catalog & Search
  CATALOG_EVENTS = "catalog.events",
  DOCUMENT_INGESTION = "knowledge.document.ingestion",
}

export interface TopicPayloadMap {
  [KafkaTopic.AI_HITL_EVENTS]: {
    type: "HITL_APPROVAL_REQUESTED";
    approvalId: string;
    userId: string;
    actionType: string;
    amount?: number | null;
    payload: Prisma.JsonValue;
    createdAt?: Date | string;
  } | {
    type: "HITL_APPROVAL_RESOLVED";
    approvalId: string;
    status: "APPROVED" | "REJECTED";
    reviewerId: string;
    payload: Prisma.JsonValue;
  };

  [KafkaTopic.AI_AGENT_AUDIT]: {
    sessionId: string;
    userId?: string;
    prompt: string;
    toolCalls: Array<{ name: string; args: any; output?: string }>;
    durationMs: number;
    timestamp: string;
  };

  [KafkaTopic.ORDER_EVENTS]: {
    type: "ORDER_CREATED" | "ORDER_CONFIRMED" | "ORDER_CANCELLED";
    orderId: string;
    userId: string;
    totalAmount: number;
    items: Array<{ productId: string; quantity: number; unitPrice: number }>;
    timestamp: string;
  };

  [KafkaTopic.INVENTORY_EVENTS]: {
    type: "STOCK_UPDATED" | "STOCK_DEPLETED";
    productId: string;
    categorySku: string;
    availableQuantity: number;
  };

  [KafkaTopic.CATALOG_EVENTS]: {
    type: "PRODUCT_CREATED" | "PRODUCT_UPDATED" | "PRODUCT_DELETED";
    productId: string;
    timestamp: string;
  };

  [KafkaTopic.DOCUMENT_INGESTION]: {
    documentId: string;
    title: string;
    s3Url: string;
    department: string;
    uploadedBy: string;
  };
}