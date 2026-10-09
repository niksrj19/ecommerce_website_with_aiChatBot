// src/config/env.ts
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  OPENAI_API_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_API_MODEL: z.string().min(1).default("gemini-embedding-001"),
  REDIS_HOST : z.string().default("127.0.0.1"),
  REDIS_PORT : z.coerce.number().default(6379),
  REDIS_PASSWORD : z.string().optional(),
  REDIS_DB :  z.coerce.number().default(0),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  PAYMENT_GATEWAY: z.enum(["RAZORPAY", "STRIPE"]).default("RAZORPAY"),
  PAYMENT_KEY_ID: z.string().min(1),
  PAYMENT_KEY_SECRET: z.string().min(1),
  PAYMENT_WEBHOOK_SECRET: z.string().min(1),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
  KAFKA_CLIENT_ID: z.string().default("aegis-commerce-backend"),
  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL: z.string().min(1)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;