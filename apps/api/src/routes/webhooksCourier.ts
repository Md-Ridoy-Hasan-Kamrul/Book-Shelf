import { Router } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import type { Logger } from '../lib/logger.js';
import { createCourierProvider } from '../providers/courier/index.js';
import { processCourierWebhook } from '../services/courier/courierWebhookService.js';

export function createCourierWebhooksRouter(env: ApiEnv, logger: Logger) {
  const router = Router();

  const handle =
    (kind: 'mock' | 'steadfast') =>
    async (
      req: { headers: Record<string, string | string[] | undefined>; body: unknown },
      res: { status: (n: number) => { json: (b: unknown) => void }; send: (s: string) => void },
    ) => {
      const providerEnv =
        kind === 'mock'
          ? { ...env, COURIER_PROVIDER: 'mock' as const }
          : { ...env, COURIER_PROVIDER: 'steadfast' as const };
      const courier = createCourierProvider(providerEnv);
      const body =
        req.body && typeof req.body === 'object' && !Array.isArray(req.body)
          ? (req.body as Record<string, unknown>)
          : {};
      const headers: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
      }
      try {
        const result = await processCourierWebhook(env, courier, headers, body);
        if (result.kind === 'rejected') {
          res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: result.reason });
          return;
        }
        logger.info({ kind, result }, 'Courier webhook');
        res.send('OK');
      } catch (err) {
        logger.error({ err, kind }, 'Courier webhook error');
        res.send('OK');
      }
    };

  router.post('/mock', handle('mock'));
  router.post('/steadfast', handle('steadfast'));

  return router;
}
