// src/modules/catalog/catalog.routes.ts
import { Router } from "express";
import { CatalogController } from "./catalog.controller.js";
import { authorize } from "../../middlewares/authorize.js";
import { authenticate } from "../../middlewares/authenticate.js";

const router = Router();

router.get("/brands", CatalogController.getBrands);
router.get("/brands/:slug", CatalogController.getBrandBySlug);
router.get("/categories", CatalogController.getCategories);
router.get("/categories/:slug", CatalogController.getCategoryBySlug);
router.get("/products", CatalogController.getProducts);
router.get("/products/:id/review-stats", CatalogController.getProductReviewStats);
router.get("/product/slug/:slug", CatalogController.getProductBySlug);
router.get("/product/:id", CatalogController.getProductById);

// Admin Only: POST /api/products
router.post(
  "/products",
  authenticate,
  authorize(["USER", "ADMIN"]), // Allow both USER and ADMIN roles to create products
  CatalogController.createProduct
);

router.put(
  "/products/:id",
  authenticate,
  authorize(["ADMIN"]),
  CatalogController.updateProduct
);

router.post(
  "/products/:id/variants",
  authenticate,
  authorize(["ADMIN"]),
  CatalogController.createProductVariant
);

router.delete(
  "/products/:id",
  authenticate,
  authorize(["ADMIN"]),
  CatalogController.deleteProduct
);

export const catalogRoutes = router;