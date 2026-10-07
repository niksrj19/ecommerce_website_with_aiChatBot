// src/modules/catalog/catalog.routes.ts
import { Router } from "express";
import { CatalogController } from "./catalog.controller";
import { authorize } from "../../middlewares/authorize";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.get("/products", CatalogController.getProducts);

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