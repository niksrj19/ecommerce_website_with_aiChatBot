import { Request, Response } from "express";
import { ZodError } from "zod";
import { PaymentService } from "./payment.service";
import { createIntentSchema, verifyPaymentSchema } from "./payment.schema";

export class PaymentController {
  // POST /api/payments/create-intent (Auth)
  static async createIntent(req: Request, res: Response): Promise<void> {
    try {
        console.log("Received request to create payment intent with body:", req.body);
      if (!req.user?.userId) {
        res.status(401).json({ error: "User not loggedIn" });
        return;
      }

      const validated = createIntentSchema.parse(req.body);
      const result = await PaymentService.createPaymentIntent(
        req.user.userId,
        validated
      );

      res.status(200).json(result);
    } catch (error: any) {
      PaymentController.handleError(error, res, "Failed to initialize payment");
    }
  }

  // POST /api/payments/verify (Auth)
  static async verify(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: "User not loggedIn" });
        return;
      }

      const validated = verifyPaymentSchema.parse(req.body);
      await PaymentService.verifyPayment(req.user.userId, validated);

      res.status(200).json({ success: true, message: "Payment verified successfully" });
    } catch (error: any) {
      PaymentController.handleError(error, res, "Failed to verify payment");
    }
  }

  private static handleError(error: any, res: Response, fallbackMsg: string): void {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "Validation Failed",
        details: error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
      });
      return;
    }

    if (error.statusCode) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error(`${fallbackMsg}:`, error);
    res.status(500).json({ error: defaultMessage(fallbackMsg, error) });
  }
}

function defaultMessage(fallback: string, err: any): string {
  return err.message || fallback;
}