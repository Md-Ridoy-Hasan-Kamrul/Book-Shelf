import { checkoutBodySchema, checkoutQuoteBodySchema, successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { AppError } from '../lib/appError.js';
import { consumeRateLimit, clientIp } from '../lib/rateLimit.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { buildCheckoutQuote } from '../services/checkout/checkoutQuoteService.js';
import { performCheckout } from '../services/checkout/checkoutService.js';

export function createCheckoutRouter(auth: BookVerseAuth, env: ApiEnv) {
  const router = Router();

  router.post('/quote', requireAuth(auth), async (req, res, next) => {
    try {
      await consumeRateLimit(env, `checkout:quote:${clientIp(req)}`, 60, 60);
      const body = checkoutQuoteBodySchema.parse(req.body);
      const built = await buildCheckoutQuote(body);
      res.json(successEnvelope(built.quote));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', requireAuth(auth), async (req, res, next) => {
    try {
      await consumeRateLimit(env, `checkout:${clientIp(req)}`, 20, 60);
      const idempotencyKey = req.header('Idempotency-Key')?.trim();
      if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
        throw new AppError('VALIDATION_ERROR', 'Idempotency-Key header is required', 400);
      }
      const user = (req as AuthedRequest).user;
      const body = checkoutBodySchema.parse(req.body);
      const data = await performCheckout(env, user, idempotencyKey, body);
      res.status(201).json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
