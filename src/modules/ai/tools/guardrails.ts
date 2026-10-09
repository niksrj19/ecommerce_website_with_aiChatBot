import { ZodSchema } from "zod";

export class ToolGuardrails {
  static validateInput<T>(schema: ZodSchema<T>, args: unknown): T {
    const parsed = schema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid tool arguments: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  static verifyRole(allowedRoles: string[], callerRole?: string): void {
    if (!callerRole || !allowedRoles.includes(callerRole)) {
      throw new Error("Access Denied: Caller does not have clearance for this operation");
    }
  }

  static sanitizeOutput(data: unknown): string {
    const raw = JSON.stringify(data);
    // Redact credit cards, tokens, emails, and phone numbers
    return raw
      .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, "************")
      .replace(/(Bearer\s+)[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, "$1[REDACTED]");
  }
}