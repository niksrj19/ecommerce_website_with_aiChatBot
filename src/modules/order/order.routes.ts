import { Router } from "express";
import { OrderController } from "./order.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";

const router = Router();

// Enforce authMiddleware for all order operations
router.use(authenticate);

router.post("/", OrderController.createOrder);
router.get("/", OrderController.getPastOrders);
router.get("/:order_id", OrderController.getOrderDetails);

export const orderRoutes = router;