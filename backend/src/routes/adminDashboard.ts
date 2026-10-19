import {
  adminRoleAppsQuerySchema,
  commissionRuleUpdateSchema,
  dashboardListQuerySchema,
  sellerVerifySchema,
  successEnvelope,
  systemSettingUpdateSchema,
} from '@bookverse/shared';
import { Router } from 'express';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { paramId } from '../lib/params.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  getAdminKpis,
  listAdminClaims,
  listAdminOrders,
  listAdminPayouts,
  listCommissionRules,
  listMarginWarnings,
  listRoleApplicationsAdmin,
  listSystemSettings,
  setSellerVerified,
  updateCommissionRule,
  updateSystemSetting,
} from '../services/dashboard/adminDashboardService.js';
import { approvePayout } from '../services/money/payoutApprovalService.js';
import { runWeeklyPayoutBatch } from '../services/money/payoutService.js';
import { listDeadLetterJobs } from '../services/jobs/deadLetterService.js';
import type { ApiEnv } from '@bookverse/shared';
import { requireAdmin2fa } from '../middleware/requireAdmin2fa.js';
import {
  confirmAdmin2fa,
  setupAdmin2fa,
  verifyAdmin2faSession,
} from '../services/admin/admin2faService.js';
import { z } from 'zod';

const totpBodySchema = z.object({
  token: z.string().trim().min(6).max(8),
});

export function createAdminDashboardRouter(auth: BookVerseAuth, env: ApiEnv) {
  const router = Router();
  router.use(requireAuth(auth), requireRole('ADMIN'));

  router.post('/2fa/setup', async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const data = await setupAdmin2fa(user.id, user.role);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/2fa/confirm', async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = totpBodySchema.parse(req.body);
      const data = await confirmAdmin2fa(user.id, user.role, body.token);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/2fa/verify', async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = totpBodySchema.parse(req.body);
      const data = await verifyAdmin2faSession(user.id, user.role, body.token);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.use(requireAdmin2fa(env));

  router.get('/dead-letter-jobs', async (_req, res, next) => {
    try {
      const data = await listDeadLetterJobs(env);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.get('/kpis', async (_req, res, next) => {
    try {
      const data = await getAdminKpis();
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.get('/margin-warnings', async (req, res, next) => {
    try {
      const q = dashboardListQuerySchema.parse(req.query);
      const data = await listMarginWarnings(q.cursor, q.limit);
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/role-applications', async (req, res, next) => {
    try {
      const q = adminRoleAppsQuerySchema.parse(req.query);
      const data = await listRoleApplicationsAdmin(q.status, q.cursor, q.limit);
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/orders', async (req, res, next) => {
    try {
      const q = dashboardListQuerySchema.parse(req.query);
      const data = await listAdminOrders(q.cursor, q.limit);
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/claims', async (req, res, next) => {
    try {
      const q = dashboardListQuerySchema.parse(req.query);
      const data = await listAdminClaims(q.cursor, q.limit);
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/payouts', async (req, res, next) => {
    try {
      const q = dashboardListQuerySchema.parse(req.query);
      const data = await listAdminPayouts(q.cursor, q.limit);
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.post('/payouts/run-batch', async (_req, res, next) => {
    try {
      const data = await runWeeklyPayoutBatch();
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/payouts/:id/approve', async (req, res, next) => {
    try {
      const admin = (req as unknown as AuthedRequest).user;
      await approvePayout(admin.id, paramId(req.params.id));
      res.json(successEnvelope({ approved: true }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/commission-rules', async (_req, res, next) => {
    try {
      const data = await listCommissionRules();
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/commission-rules/:id', async (req, res, next) => {
    try {
      const admin = (req as unknown as AuthedRequest).user;
      const body = commissionRuleUpdateSchema.parse(req.body);
      const data = await updateCommissionRule(admin.id, paramId(req.params.id), body);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.get('/system-settings', async (_req, res, next) => {
    try {
      const data = await listSystemSettings();
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/system-settings/:key', async (req, res, next) => {
    try {
      const admin = (req as unknown as AuthedRequest).user;
      const body = systemSettingUpdateSchema.parse(req.body);
      const data = await updateSystemSetting(admin.id, paramId(req.params.key), body.value);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/sellers/:userId/verify', async (req, res, next) => {
    try {
      const admin = (req as unknown as AuthedRequest).user;
      const body = sellerVerifySchema.parse(req.body);
      const data = await setSellerVerified(admin.id, paramId(req.params.userId), body.verified);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
