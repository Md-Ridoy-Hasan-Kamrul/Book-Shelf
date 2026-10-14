import { z } from 'zod';

export const healthDataSchema = z.object({
	status: z.literal('ok'),
});

export const apiSuccessEnvelopeSchema = <T extends z.ZodType>(dataSchema: T) =>
	z.object({
		success: z.literal(true),
		data: dataSchema,
		meta: z.record(z.string(), z.unknown()).optional(),
	});

export const healthResponseSchema = apiSuccessEnvelopeSchema(healthDataSchema);

export type HealthResponse = z.infer<typeof healthResponseSchema>;
