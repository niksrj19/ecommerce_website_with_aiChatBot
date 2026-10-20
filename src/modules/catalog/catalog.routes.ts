// src/modules/catalog/catalog.routes.ts
import { Router } from "express";
import { CatalogController } from "./catalog.controller.js";
import { authorize } from "../../middlewares/authorize.js";
import { authenticate } from "../../middlewares/authenticate.js";

const router = Router();

router.get("/products", CatalogController.getProducts);
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

router.delete(
  "/products/:id",
  authenticate,
  authorize(["ADMIN"]),
  CatalogController.deleteProduct
);

export const catalogRoutes = router;