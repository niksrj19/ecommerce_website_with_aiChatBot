// src/modules/inventory/inventory.routes.ts
import { Router } from "express";
import { InventoryController } from "./inventory.controller";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";

const router = Router();

// Protected modification endpoints (Admin only)
router.post(
  "/",
  authenticate,
  authorize(["ADMIN",'USER']),
  InventoryController.createInventory
);

router.patch(
  "/:id",
  authenticate,
  authorize(["ADMIN",'USER']),
  InventoryController.updateInventory
);

// Product inventory breakdown (Accessible to authenticated users/support/admin)
router.get(
  "/product/:productId",
  authenticate,
  InventoryController.getByProduct
);

export const inventoryRoutes = router;