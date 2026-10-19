import { z } from 'zod';

const boolish = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined) return false;
    if (typeof v === 'boolean') return v;
    return v === 'true' || v === '1';
  });

export const WebEnvSchema = z.object({
  PUBLIC_API_URL: z.url().default('http://localhost:4000'),
  FEATURE_USED_BOOKS: boolish,
  FEATURE_SPONSORED: boolish,
  FEATURE_LIVE_EVENTS: boolish,
});

export type WebEnv = z.infer<typeof WebEnvSchema>;

export function loadWebEnv(source: Record<string, string | undefined>): WebEnv {
  const parsed = WebEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid web environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
