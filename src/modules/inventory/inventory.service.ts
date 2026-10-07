// src/modules/inventory/inventory.service.ts
import { Prisma } from "@prisma/client";
import { db } from "../../core/database";
import { CreateInventoryInput, UpdateInventoryInput } from "./inventory.schema";

export class InventoryService {
  static async createInventory(input: CreateInventoryInput) {
    // 1. Verify referenced product exists
    const product = await db.product.findUnique({
      where: { id: input.productId },
      select: { id: true },
    });

    if (!product) {
      const error: any = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. Insert inventory record
    return db.inventory.create({
      data: {
        productId: input.productId,
        categorySku: input.categorySku,
        color: input.color,
        size: input.size,
        quantityInStock: input.quantityInStock,
        unitPrice: new Prisma.Decimal(input.unitPrice),
        reserved: input.reserved,
        storeId: input.storeId,
      },
    });
  }

  static async updateInventory(id: string, input: UpdateInventoryInput) {
    // 1. Check if inventory item exists
    const existing = await db.inventory.findUnique({ where: { id } });
    if (!existing) {
      const error: any = new Error("Inventory record not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. Guard against negative stock levels with atomic updates
    if (input.quantityDelta !== undefined) {
      const projectedStock = existing.quantityInStock + input.quantityDelta;
      if (projectedStock < 0) {
        const error: any = new Error(`Insufficient stock. Current: ${existing.quantityInStock}, requested delta: ${input.quantityDelta}`);
        error.statusCode = 400;
        throw error;
      }
    }

    if (input.reservedDelta !== undefined) {
      const projectedReserved = existing.reserved + input.reservedDelta;
      if (projectedReserved < 0) {
        const error: any = new Error("Reserved quantity cannot be less than 0");
        error.statusCode = 400;
        throw error;
      }
    }

    // 3. Construct atomic update payload
    const updateData: Prisma.InventoryUpdateInput = {};

    if (input.quantityDelta !== undefined) {
      updateData.quantityInStock = { increment: input.quantityDelta };
    } else if (input.quantityInStock !== undefined) {
      updateData.quantityInStock = input.quantityInStock;
    }

    if (input.reservedDelta !== undefined) {
      updateData.reserved = { increment: input.reservedDelta };
    } else if (input.reserved !== undefined) {
      updateData.reserved = input.reserved;
    }

    if (input.unitPrice !== undefined) {
      updateData.unitPrice = new Prisma.Decimal(input.unitPrice);
    }

    if (input.color !== undefined) updateData.color = input.color;
    if (input.size !== undefined) updateData.size = input.size;
    if (input.storeId !== undefined) updateData.storeId = input.storeId;

    return db.inventory.update({
      where: { id },
      data: updateData,
    });
  }

  static async getInventoryByProduct(productId: string) {
    // 1. Verify product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, title: true, brand: true },
    });

    if (!product) {
      const error: any = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. Fetch inventory locations
    const inventory = await db.inventory.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });

    const summary = inventory.reduce(
      (acc, item) => {
        acc.totalInStock += item.quantityInStock;
        acc.totalReserved += item.reserved;
        acc.availableToSell += item.quantityInStock - item.reserved;
        return acc;
      },
      { totalInStock: 0, totalReserved: 0, availableToSell: 0 }
    );

    return {
      product,
      summary,
      locations: inventory,
    };
  }
}