import { z } from 'zod';

const EnvSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
	PORT: z.coerce.number().int().positive().default(4000),
	WEB_ORIGIN: z.url().default('http://localhost:4321'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
	const result = EnvSchema.safeParse(source);
	if (!result.success) {
		throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
	}
	return result.data;
}
