// src/modules/contact/contact.service.ts
import { db } from "../../core/database";
import { ContactInquiryInput } from "./contact.schema";
import { ContactMailer } from "./contact.mailer";

export class ContactService {
  static async processInquiry(data: ContactInquiryInput) {
    // 1. Persist inquiry record to PostgreSQL
    const inquiry = await db.contactInquiry.create({
      data: {
        name: data.name,
        email: data.email,
        topic: data.topic,
        orderNumber: data.orderNumber || null,
        message: data.message,
        status: "OPEN",
      },
    });

    // 2. Dispatch email asynchronously (failsafe - does not block HTTP response)
    ContactMailer.sendInquiryNotification(inquiry).catch((err) => {
      console.error("❌ Failed to send contact notification email:", err.message);
    });

    return inquiry;
  }
}