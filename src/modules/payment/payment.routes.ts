import { Router } from "express";
import express from "express";
import { PaymentController } from "./payment.controller";
import { PaymentWebhookHandler } from "./payment.webhook";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

// Public Webhook: Uses raw express.raw body parser exclusively for this route
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  PaymentWebhookHandler.handleWebhook
);

// Authenticated Endpoints
router.post("/create-intent", authenticate, PaymentController.createIntent);
router.post("/verify", authenticate, PaymentController.verify);

export const paymentRoutes = router;