// src/modules/cart/cart.routes.ts
import { Router } from "express";
import { CartController } from "./cart.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { optionalAuthenticate } from "../../middlewares/optional-auth.js";

const router = Router();

// Public / Dual-mode (Guest or Auth)
router.get("/", optionalAuthenticate, CartController.getCart);
router.post("/items", optionalAuthenticate, CartController.addItem);
router.put("/items", optionalAuthenticate, CartController.updateItem);
router.delete("/items", optionalAuthenticate, CartController.removeItem);
router.delete("/clear", optionalAuthenticate, CartController.clearCart);

// Authenticated Only: Cart Merge
router.post("/merge", authenticate, CartController.mergeCart);

export const cartRoutes = router;