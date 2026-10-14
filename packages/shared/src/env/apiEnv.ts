import { z } from 'zod';

const providerEnum = (name: string, values: readonly [string, ...string[]]) =>
  z
    .string()
    .default(values[0])
    .refine((v) => values.includes(v), `${name} invalid`);

export const ApiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.url().default('http://localhost:4321'),
  API_ORIGIN: z.url().default('http://localhost:4000'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://bookverse:bookverse@localhost:5432/bookverse'),
  DIRECT_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  BETTER_AUTH_SECRET: z.string().min(32).default('local-dev-only-change-before-production-32chars'),
  BETTER_AUTH_URL: z.url().default('http://localhost:4000'),
  STORAGE_PROVIDER: providerEnum('STORAGE_PROVIDER', ['local']),
  EMAIL_PROVIDER: providerEnum('EMAIL_PROVIDER', ['smtp']),
  SMS_PROVIDER: providerEnum('SMS_PROVIDER', ['console']),
  PAYMENT_PROVIDER: providerEnum('PAYMENT_PROVIDER', ['mock', 'sslcommerz']),
  COURIER_PROVIDER: providerEnum('COURIER_PROVIDER', ['mock', 'steadfast']),
  LLM_PROVIDER: providerEnum('LLM_PROVIDER', ['off']),
  SEARCH_PROVIDER: providerEnum('SEARCH_PROVIDER', ['pg']),
  SSLCOMMERZ_STORE_ID: z.string().default(''),
  SSLCOMMERZ_STORE_PASSWORD: z.string().default(''),
  STEADFAST_API_KEY: z.string().default(''),
  STEADFAST_SECRET_KEY: z.string().default(''),
  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET: z.string().default(''),
  FEATURE_RIDER: z.coerce.boolean().default(false),
  FEATURE_LIVE_EVENTS: z.coerce.boolean().default(false),
  FEATURE_SPONSORED: z.coerce.boolean().default(false),
  FEATURE_MOOD_LLM: z.coerce.boolean().default(false),
  FEATURE_USED_BOOKS: z.coerce.boolean().default(false),
  HEALTH_SKIP_INFRA: z.coerce.boolean().default(false),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_FROM: z.string().email().default('noreply@bookverse.local'),
  UPLOAD_DIR: z.string().default('uploads'),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5_242_880),
});

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export function loadApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const parsed = ApiEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid API environment:\n${z.prettifyError(parsed.error)}`);
  }
  const env = parsed.data;
  if (!env.DIRECT_URL) {
    return { ...env, DIRECT_URL: env.DATABASE_URL };
  }
  return env;
}
