import { successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { ApiEnv } from '@bookverse/shared';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { paramId } from '../lib/params.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { resolveClaim } from '../services/money/claimService.js';
import { runWeeklyPayoutBatch } from '../services/money/payoutService.js';
import { reconcileOrdersVsLedger } from '../services/money/reconcileService.js';
import { confirmCodRemit } from '../services/money/codRemitService.js';
import { createCourierProvider } from '../providers/courier/index.js';
import { retryShipmentCreate } from '../services/courier/shipmentService.js';

const resolveSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  note: z.string().min(1).max(2000),
});

export function createAdminMoneyRouter(auth: BookVerseAuth, env: ApiEnv) {
  const router = Router();

  router.post('/payouts/run', requireAuth(auth), requireRole('ADMIN'), async (_req, res, next) => {
    try {
      const data = await runWeeklyPayoutBatch();
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.get('/reconcile', requireAuth(auth), requireRole('ADMIN'), async (_req, res, next) => {
    try {
      const data = await reconcileOrdersVsLedger();
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/claims/:orderId/resolve',
    requireAuth(auth),
    requireRole('ADMIN'),
    async (req, res, next) => {
      try {
        const admin = (req as AuthedRequest).user;
        const body = resolveSchema.parse(req.body);
        await resolveClaim(admin.id, paramId(req.params.orderId), body.decision, body.note);
        res.json(successEnvelope({ resolved: true }));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/orders/:orderId/shipment-retry',
    requireAuth(auth),
    requireRole('ADMIN'),
    async (req, res, next) => {
      try {
        const courier = createCourierProvider(env);
        await retryShipmentCreate(env, courier, paramId(req.params.orderId));
        res.json(successEnvelope({ retried: true }));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/orders/:orderId/cod-remit',
    requireAuth(auth),
    requireRole('ADMIN'),
    async (req, res, next) => {
      try {
        await confirmCodRemit(paramId(req.params.orderId), env);
        res.json(successEnvelope({ remitted: true }));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
