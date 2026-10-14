import { z } from 'zod';

export const apiErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  code: z.string(),
  message: z.string(),
  errors: z.array(z.unknown()).default([]),
});

export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>;

export function successEnvelope<T>(data: T, meta: Record<string, unknown> = {}) {
  return { success: true as const, data, meta };
}

export function errorEnvelope(
  code: string,
  message: string,
  errors: unknown[] = [],
): ApiErrorEnvelope {
  return { success: false, code, message, errors };
}
