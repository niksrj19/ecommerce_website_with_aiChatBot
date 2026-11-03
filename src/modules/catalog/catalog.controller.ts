// src/modules/catalog/catalog.controller.ts
import { Request, Response } from "express";
import {Prisma} from "@prisma/client";
import { CatalogService } from "./catalog.service.js";
import {
  createProductSchema,
  createProductVariantSchema,
  getProductsQuerySchema,
  lookupQuerySchema,
  productIdParamSchema,
  updateProductSchema,
} from "./catalog.schema.js";
import { ZodError } from "zod";

export class CatalogController {
  static async getBrands(req: Request, res: Response): Promise<void> {
    try {
      const query = lookupQuerySchema.parse(req.query);
      const brands = await CatalogService.getBrands(query);
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=900, stale-while-revalidate=60");
      res.status(200).json(brands);
    } catch (error) {
      CatalogController.handleErrors(error, res, "Failed to fetch brands");
    }
  }

  static async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const query = lookupQuerySchema.parse(req.query);
      const categories = await CatalogService.getCategories(query);
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=900, stale-while-revalidate=60");
      res.status(200).json(categories);
    } catch (error) {
      CatalogController.handleErrors(error, res, "Failed to fetch categories");
    }
  }

  static async getBrandBySlug(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      if (!slug || Array.isArray(slug)) {
        res.status(400).json({ error: "Invalid brand slug" });
        return;
      }
      const brand = await CatalogService.getBrandBySlug(slug);
      if (!brand) {
        res.status(404).json({ error: "Brand not found" });
        return;
      }
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=900, stale-while-revalidate=60");
      res.status(200).json(brand);
    } catch (error) {
      CatalogController.handleErrors(error, res, "Failed to fetch brand");
    }
  }

  static async getCategoryBySlug(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      if (!slug || Array.isArray(slug)) {
        res.status(400).json({ error: "Invalid category slug" });
        return;
      }
      const category = await CatalogService.getCategoryBySlug(slug);
      if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
      }
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=900, stale-while-revalidate=60");
      res.status(200).json(category);
    } catch (error) {
      CatalogController.handleErrors(error, res, "Failed to fetch category");
    }
  }

  static async getProductReviewStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = productIdParamSchema.parse(req.params);
      const stats = await CatalogService.getProductReviewStats(id);
      if (!stats) {
        res.status(404).json({ error: "Product review statistics not found" });
        return;
      }
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=30");
      res.status(200).json(stats);
    } catch (error) {
      CatalogController.handleErrors(error, res, "Failed to fetch product review statistics");
    }
  }

  static async getProductBySlug(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      if (!slug || Array.isArray(slug)) {
        res.status(400).json({ error: "Invalid product slug" });
        return;
      }
      const product = await CatalogService.getProductBySlug(slug);
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=5, stale-while-revalidate=5");
      res.status(200).json(product);
    } catch (error) {
      CatalogController.handleErrors(error, res, "Failed to fetch product");
    }
  }

  static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = productIdParamSchema.parse(req.params);
      const product = await CatalogService.getProductById(id);

      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      res.status(200).json(product);
    } catch (error: any) {
      CatalogController.handleErrors(error, res, "Failed to fetch product");
    }
  }

  static async getProducts(req: Request, res: Response): Promise<void> {
    try {
      // Validate and parse incoming query parameters
      const parsedQuery = getProductsQuerySchema.parse(req.query);

      const result = await CatalogService.getProducts(parsedQuery);

      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=15");
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

  static async createProductVariant(req: Request, res: Response): Promise<void> {
    try {
      const { id } = productIdParamSchema.parse(req.params);
      const data = createProductVariantSchema.parse(req.body);
      const variant = await CatalogService.createProductVariant(id, data);
      res.status(201).json(variant);
    } catch (error) {
      CatalogController.handleErrors(error, res, "Failed to create product variant");
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