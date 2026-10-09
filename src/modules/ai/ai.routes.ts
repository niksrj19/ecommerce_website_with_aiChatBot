import { Router } from "express";
import { AIController } from "./ai.controller";
import { optionalAuthenticate } from "../../middlewares/optional-auth";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";

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