import { successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { ApiEnv } from '@bookverse/shared';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { createPaymentProvider } from '../providers/payment/index.js';
import { initiateCheckoutPayment } from '../services/money/paymentInitiateService.js';

const initiateSchema = z.object({ checkoutId: z.string().min(1) });

export function createPaymentsRouter(auth: BookVerseAuth, env: ApiEnv) {
  const router = Router();
  const payment = createPaymentProvider(env);

  router.post('/initiate', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = initiateSchema.parse(req.body);
      const data = await initiateCheckoutPayment(env, payment, user, body.checkoutId);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
