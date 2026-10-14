import { successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { paramId } from '../lib/params.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  adminTransitionOrder,
  cancelOrderByBuyer,
  getOrderForBuyer,
  listOrdersForBuyer,
} from '../services/order/orderService.js';

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const adminStatusSchema = z.object({
  status: z.enum([
    'PENDING_PAYMENT',
    'PAID',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ]),
  note: z.string().max(500).optional(),
});

export function createOrdersRouter(auth: BookVerseAuth) {
  const router = Router();

  router.get('/', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const query = listQuerySchema.parse(req.query);
      const data = await listOrdersForBuyer(user.id, query.cursor, query.limit);
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const data = await getOrderForBuyer(user.id, paramId(req.params.id));
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/cancel', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      await cancelOrderByBuyer(user, paramId(req.params.id));
      res.json(successEnvelope({ cancelled: true }));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/:id/admin-status',
    requireAuth(auth),
    requireRole('ADMIN'),
    async (req, res, next) => {
      try {
        const admin = (req as AuthedRequest).user;
        const body = adminStatusSchema.parse(req.body);
        await adminTransitionOrder(admin.id, paramId(req.params.id), body.status, body.note);
        res.json(successEnvelope({ updated: true }));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
