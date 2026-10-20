// src/modules/contact/contact.mailer.ts
import nodemailer from "nodemailer";
import { env } from "../..//config/env.js"
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || "smtp.gmail.com",
  port: Number(env.SMTP_PORT) || 587,
  secure: true, // true for 465, false for 587
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS, // Use Google App Password if using Gmail SMTP
  },
});

interface InquiryEmailData {
  id: string;
  name: string;
  email: string;
  topic: string;
  orderNumber?: string | null;
  message: string;
  createdAt: Date;
}

export class ContactMailer {
  private static SUPPORT_EMAIL = "niksrj.tak@gmail.com";

  static async sendInquiryNotification(inquiry: InquiryEmailData): Promise<void> {
    const formattedDate = new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(inquiry.createdAt);

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 24px; }
          .header h2 { margin: 0; color: #111827; font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          .badge { display: inline-block; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; margin-top: 8px; }
          .grid { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .grid td { padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
          .grid .label { color: #6b7280; font-weight: 500; width: 130px; }
          .grid .value { color: #111827; font-weight: 600; }
          .message-box { background: #f9fafb; border-left: 4px solid #111827; border-radius: 4px; padding: 16px; margin: 16px 0 24px 0; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap; }
          .footer { font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h2>BaseSole Support Inquiry</h2>
            <span class="badge">${inquiry.topic}</span>
          </div>

          <table class="grid">
            <tr>
              <td class="label">Ticket ID:</td>
              <td class="value"><code>#${inquiry.id.slice(0, 8)}</code></td>
            </tr>
            <tr>
              <td class="label">Customer Name:</td>
              <td class="value">${inquiry.name}</td>
            </tr>
            <tr>
              <td class="label">Customer Email:</td>
              <td class="value"><a href="mailto:${inquiry.email}" style="color: #2563eb; text-decoration: none;">${inquiry.email}</a></td>
            </tr>
            ${
              inquiry.orderNumber
                ? `<tr>
                    <td class="label">Order Number:</td>
                    <td class="value"><strong>${inquiry.orderNumber}</strong></td>
                  </tr>`
                : ""
            }
            <tr>
              <td class="label">Submitted At:</td>
              <td class="value">${formattedDate}</td>
            </tr>
          </table>

          <div style="font-size: 13px; font-weight: 600; color: #4b5563; text-transform: uppercase; letter-spacing: 0.5px;">Customer Message:</div>
          <div class="message-box">${inquiry.message}</div>

          <div class="footer">
            Automated notification from BaseSole Storefront • <a href="http://localhost:3000/admin/support" style="color: #6b7280;">View in Helpdesk</a>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"BaseSole Support" <${env.SMTP_USER || "no-reply@basesole.com"}>`,
      to: this.SUPPORT_EMAIL,
      replyTo: inquiry.email,
      subject: `[BaseSole Support] ${inquiry.topic}: ${inquiry.name} (#${inquiry.id.slice(0, 8)})`,
      html: htmlBody,
    });
  }
}