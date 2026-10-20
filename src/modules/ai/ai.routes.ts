import { Router } from "express";
import { AIController } from "./ai.controller.js";
import { optionalAuthenticate } from "../../middlewares/optional-auth.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";

const router = Router();

// Streaming conversational endpoint (dual-mode: authenticated or guest)
router.post("/chat/stream", optionalAuthenticate, AIController.chatStream);

// HITL Management (Restricted to Manager and Admin)
router.post(
  "/hitl/approve",
  authenticate,
  authorize(["ADMIN", "MANAGER"]),
  AIController.resolveApproval
);

export const aiRoutes = router;