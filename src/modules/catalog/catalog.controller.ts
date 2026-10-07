// src/modules/catalog/catalog.controller.ts
import { Request, Response } from "express";
import {Prisma} from "@prisma/client";
import { CatalogService } from "./catalog.service";
import { createProductSchema, getProductsQuerySchema, productIdParamSchema, updateProductSchema } from "./catalog.schema";
import { ZodError } from "zod";

export class CatalogController {
  static async getProducts(req: Request, res: Response): Promise<void> {
    try {
      // Validate and parse incoming query parameters
      const parsedQuery = getProductsQuerySchema.parse(req.query);

      const result = await CatalogService.getProducts(parsedQuery);

      res.status(200).json(result);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Invalid query parameters", details: error.errors });
        return;
      }
      res.status(500).json({ error: "Failed to fetch products" });
    }
  }

  static async createProduct(req: Request, res: Response): Promise<void> {
    try {
      // 1. Validate request body against Zod schema
      const validatedData = createProductSchema.parse(req.body);

      // 2. Persist to database
      const product = await CatalogService.createProduct(validatedData);

      // 3. Return 201 Created with the full record
      res.status(201).json(product);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Validation Failed",
          details: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }

      console.error("Failed to create product:", error);
      res.status(500).json({ error: "Internal server error while creating product" });
    }
  }

  // PUT /api/products/:id (Admin only)
  static async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      // 1. Validate UUID parameter
      const { id } = productIdParamSchema.parse(req.params);

      // 2. Validate request body
      const validatedBody = updateProductSchema.parse(req.body);

      // 3. Perform update
      const updatedProduct = await CatalogService.updateProduct(id, validatedBody);

      res.status(200).json(updatedProduct);
    } catch (error: any) {
      CatalogController.handleErrors(error, res, "Failed to update product");
    }
  }

  // DELETE /api/products/:id (Admin only)
  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      // 1. Validate UUID parameter
      const { id } = productIdParamSchema.parse(req.params);

      // 2. Execute deletion
      const result = await CatalogService.deleteProduct(id);

      res.status(200).json(result);
    } catch (error: any) {
      CatalogController.handleErrors(error, res, "Failed to delete product");
    }
  }

  // Centralized Error Mapping Helper
  private static handleErrors(error: any, res: Response, defaultMessage: string): void {
    // 400 Bad Request: Zod validation failure
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "Validation Failed",
        details: error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }

    // Prisma Known Request Errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2025": // An operation failed because it depends on one or more records that were required but not found
          res.status(404).json({ error: "Product not found" });
          return;
        case "P2003": // Foreign key constraint violation
          res.status(409).json({
            error: "Cannot complete operation: foreign key constraint failed on linked records",
          });
          return;
        default:
          res.status(400).json({ error: `Database error: ${error.message}` });
          return;
      }
    }

    // Custom operational error status (e.g. 404 from service check)
    if (error.statusCode) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    // 500 Internal Server Error fallback
    console.error(`${defaultMessage}:`, error);
    res.status(500).json({ error: defaultMessage });
  }
}