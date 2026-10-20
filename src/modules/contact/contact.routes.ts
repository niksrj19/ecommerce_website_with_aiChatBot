// src/modules/contact/contact.routes.ts
import { Router } from "express";
import { ContactController } from "./contact.controller";

const router = Router();

router.post("/", ContactController.submitInquiry);

export const contactRoutes = router;