// src/modules/cart/cart.routes.ts
import { Router } from "express";
import { CartController } from "./cart.controller";
import { authenticate } from "../../middlewares/authenticate";
import { optionalAuthenticate } from "../../middlewares/optional-auth";

const router = Router();

// Public / Dual-mode (Guest or Auth)
router.get("/", optionalAuthenticate, CartController.getCart);
router.post("/items", optionalAuthenticate, CartController.addItem);
router.put("/items", optionalAuthenticate, CartController.updateItem);
router.delete("/items", optionalAuthenticate, CartController.removeItem);
router.delete("/", optionalAuthenticate, CartController.clearCart);

// Authenticated Only: Cart Merge
router.post("/merge", authenticate, CartController.mergeCart);

export const cartRoutes = router;