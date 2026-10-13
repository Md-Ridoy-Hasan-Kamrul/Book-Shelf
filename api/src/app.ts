import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import type { Env } from './env.js';
import { healthRouter } from './routes/health.js';

export function createApp(env: Env) {
	const app = express();

	app.disable('x-powered-by');
	app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
	app.use(express.json({ limit: '1mb' }));

	app.use('/health', healthRouter);

	app.use((_req, res) => {
		res.status(404).json({ error: 'Not found' });
	});

	const onError: ErrorRequestHandler = (err, _req, res, _next) => {
		if (err instanceof ZodError) {
			res.status(400).json({ error: 'Invalid request', issues: err.issues });
			return;
		}
		console.error(err);
		res.status(500).json({ error: 'Internal server error' });
	};
	app.use(onError);

	return app;
}
