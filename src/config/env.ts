import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  EXECUTION_WORKER_URL: z.string().url().optional(),
  EXECUTION_LIVE_ENABLED: z.enum(["true", "false"]).default("false"),
  AUDIT_SIGNING_SECRET: z.string().min(32).optional(),
});

export type AppEnvironment = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
