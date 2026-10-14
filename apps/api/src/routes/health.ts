import { successEnvelope, type ApiEnv } from '@bookverse/shared';
import { Router } from 'express';
import { getHealthStatus } from '../services/healthService.js';

export function createHealthRouter(env: ApiEnv) {
  const healthRouter = Router();

  healthRouter.get('/', async (_req, res) => {
    const data = await getHealthStatus(env);
    const statusCode = data.status === 'ok' ? 200 : 503;
    res
      .status(statusCode)
      .json(successEnvelope(data, { requestId: res.getHeader('x-request-id') }));
  });

  return healthRouter;
}
