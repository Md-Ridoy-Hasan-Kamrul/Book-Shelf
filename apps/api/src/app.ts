import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import type { Env } from './env.js';
import { healthRouter } from './routes/health.js';

export function createApp(env: Env) {
	const app = express();

	app.disable('x-powered-by');
	app.use(helmet());
	app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
	app.use(express.json({ limit: '1mb' }));

	app.use('/health', healthRouter);

	app.use((_req, res) => {
		res.status(404).json({
			success: false,
			code: 'NOT_FOUND',
			message: 'Not found',
			errors: [],
		});
	});

	const onError: ErrorRequestHandler = (err, _req, res, _next) => {
		if (err instanceof ZodError) {
			res.status(400).json({
				success: false,
				code: 'VALIDATION_ERROR',
				message: 'Invalid request',
				errors: err.issues,
			});
			return;
		}
		console.error(err);
		res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'Internal server error',
			errors: [],
		});
	};
	app.use(onError);

	return app;
}
