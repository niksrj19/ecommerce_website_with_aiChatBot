import { Router } from "express";
import { SearchController } from "./search.controller";

const router = Router();

// GET /api/search (Public, fast-path cached search)
router.get("/", SearchController.search);

export const searchRoutes = router;