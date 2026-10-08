// src/config/redis.config.ts
import { z } from "zod";

export const redisConfigSchema = z.object({
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_TLS: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});