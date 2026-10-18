import { Router } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import type { Logger } from '../lib/logger.js';
import { createPaymentProvider } from '../providers/payment/index.js';
import { processPaymentIpn } from '../services/money/paymentIpnService.js';

function bodyToRecord(body: unknown): Record<string, string> {
  if (!body || typeof body !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (v != null) out[k] = String(v);
  }
  return out;
}

export function createPaymentWebhooksRouter(env: ApiEnv, logger: Logger) {
  const router = Router();
  const providerFor = (kind: 'mock' | 'sslcommerz') => {
    if (kind === 'mock') return createPaymentProvider({ ...env, PAYMENT_PROVIDER: 'mock' });
    return createPaymentProvider({ ...env, PAYMENT_PROVIDER: 'sslcommerz' });
  };

  const handle =
    (kind: 'mock' | 'sslcommerz') =>
    async (req: { body: unknown }, res: { send: (s: string) => void }) => {
      try {
        const provider = providerFor(kind);
        const result = await processPaymentIpn(env, provider, bodyToRecord(req.body));
        logger.info({ kind, result }, 'Payment IPN received');
        res.send('OK');
      } catch (err) {
        logger.error({ err, kind }, 'Payment IPN failed');
        res.send('OK');
      }
    };

  router.post('/mock', handle('mock'));
  router.post('/sslcommerz', handle('sslcommerz'));

  return router;
}
