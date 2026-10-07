// src/modules/inventory/inventory.controller.ts
import { Request, Response } from "express";
import { ZodError } from "zod";
import { InventoryService } from "./inventory.service";
import { createInventorySchema, updateInventorySchema } from "./inventory.schema";

export class InventoryController {
  private static getParamValue(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0] : value || "";
  }

  // POST /api/inventory (Admin only)
  static async createInventory(req: Request, res: Response): Promise<void> {
    try {
      const validated = createInventorySchema.parse(req.body);
      const inventory = await InventoryService.createInventory(validated);
      res.status(201).json(inventory);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Validation failed",
          details: error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
        });
        return;
      }
      res.status(error.statusCode || 500).json({ error: error.message || "Failed to create inventory" });
    }
  }

  // PATCH /api/inventory/:id (Admin only)
  static async updateInventory(req: Request, res: Response): Promise<void> {
    try {
      const id = InventoryController.getParamValue(req.params.id);
      const validated = updateInventorySchema.parse(req.body);
      const updated = await InventoryService.updateInventory(id, validated);
      res.status(200).json(updated);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Validation failed",
          details: error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
        });
        return;
      }
      res.status(error.statusCode || 500).json({ error: error.message || "Failed to update inventory" });
    }
  }

  // GET /api/inventory/product/:productId
  static async getByProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = InventoryController.getParamValue(req.params.productId);
      const result = await InventoryService.getInventoryByProduct(productId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch inventory" });
    }
  }
}