import { Request, Response } from "express";
import { SearchService } from "./search.service";
import { searchRequestSchema } from "./search.schema";
import { ZodError } from "zod";

export class SearchController {
  static async search(req: Request, res: Response): Promise<void> {
    try {
      const validated = searchRequestSchema.parse(req.query);
      const result = await SearchService.search(validated);
      res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Invalid search query parameters",
          details: error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
        });
        return;
      }
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  }
}