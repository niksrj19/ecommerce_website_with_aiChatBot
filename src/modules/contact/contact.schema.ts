// src/modules/contact/contact.schema.ts
import { z } from "zod";

export const contactInquirySchema = z.object({
  name: z
    .string({ message: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters"),
  email: z
    .string({ message: "Email is required" })
    .trim()
    .email("Please provide a valid email address"),
  topic: z
    .string({ message: "Topic is required" })
    .trim()
    .min(1, "Please select an inquiry topic"),
  orderNumber: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  message: z
    .string({ message: "Message is required" })
    .trim()
    .min(10, "Message must be at least 10 characters long"),
});

export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;