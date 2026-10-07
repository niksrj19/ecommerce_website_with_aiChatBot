// src/modules/auth/auth.routes.ts
import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.get("/google", AuthController.googleLogin);
router.get("/google/callback", AuthController.googleCallback);
router.post("/refresh", AuthController.refresh);
router.post("/logout", authenticate, AuthController.logout);

// Protected endpoint to verify authentication works
router.get("/me", authenticate, (req, res) => {
  res.status(200).json({ user: req.user });
});

export const authRoutes = router;