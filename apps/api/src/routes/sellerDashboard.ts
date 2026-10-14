import {
  dashboardListQuerySchema,
  sellerOrdersQuerySchema,
  successEnvelope,
} from '@bookverse/shared';
import { Router } from 'express';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { paramId } from '../lib/params.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { requireSeller } from '../middleware/requireSeller.js';
import { markOrderPacked } from '../services/courier/shipmentService.js';
import {
  getSellerOrder,
  getSellerOverview,
  listSellerClaims,
  listSellerEarnings,
  listSellerListings,
  listSellerOrders,
  listSellerPayouts,
} from '../services/dashboard/sellerDashboardService.js';
import type { ApiEnv } from '@bookverse/shared';

export function createSellerDashboardRouter(auth: BookVerseAuth, env: ApiEnv) {
  const router = Router();
  router.use(requireAuth(auth), requireSeller());

  router.get('/overview', async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const data = await getSellerOverview(user.id);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.get('/listings', async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const q = dashboardListQuerySchema.parse(req.query);
      const data = await listSellerListings(user.id, q.cursor, q.limit);
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/orders', async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const q = sellerOrdersQuerySchema.parse(req.query);
      const data = await listSellerOrders(user.id, q.filter, q.cursor, q.limit);
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/orders/:id', async (req, res, next) => {
    try {
      const user = (req as unknown as AuthedRequest).user;
      const data = await getSellerOrder(user.id, paramId(req.params.id));
      res.json(
        successEnvelope({
          id: data.id,
          status: data.status,
          total: data.total.toString(),
          buyerName: data.buyer.name,
          shipment: data.shipment
            ? {
                trackingCode: data.shipment.trackingCode,
                consignmentId: data.shipment.consignmentId,
              }
            : null,
        }),
      );
    } catch (err) {
      next(err);
    }
  });

  router.post('/orders/:id/pack', async (req, res, next) => {
    try {
      const user = (req as unknown as AuthedRequest).user;
      await markOrderPacked(user.id, paramId(req.params.id), env);
      res.json(successEnvelope({ packed: true }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/earnings', async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const q = dashboardListQuerySchema.parse(req.query);
      const data = await listSellerEarnings(user.id, q.cursor, q.limit);
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/payouts', async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const q = dashboardListQuerySchema.parse(req.query);
      const data = await listSellerPayouts(user.id, q.cursor, q.limit);
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/claims', async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const q = dashboardListQuerySchema.parse(req.query);
      const data = await listSellerClaims(user.id, q.cursor, q.limit);
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
