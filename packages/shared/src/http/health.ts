import { z } from 'zod';
import { apiSuccessEnvelopeSchema } from './envelopeHelpers.js';

export const healthDataSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.boolean(),
  redis: z.boolean(),
});

export const healthResponseSchema = apiSuccessEnvelopeSchema(healthDataSchema);

export type HealthData = z.infer<typeof healthDataSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
