import { z } from 'zod';

export const WebEnvSchema = z.object({
  PUBLIC_API_URL: z.url().default('http://localhost:4000'),
});

export type WebEnv = z.infer<typeof WebEnvSchema>;

export function loadWebEnv(source: Record<string, string | undefined>): WebEnv {
  const parsed = WebEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid web environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
