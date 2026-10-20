// src/modules/contact/contact.controller.ts
import { Request, Response } from "express";
import { ZodError } from "zod";
import { contactInquirySchema } from "./contact.schema.js";
import { ContactService } from "./contact.service.js";

export class ContactController {
  // POST /api/contact (Public)
  static async submitInquiry(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = contactInquirySchema.parse(req.body);

      await ContactService.processInquiry(validatedInput);

      res.status(200).json({
        success: true,
        message: "Your message has been sent successfully. We'll get back to you soon!",
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }

      console.error("Contact Inquiry Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error while processing your inquiry.",
      });
    }
  }
}