import { roleApplicationCreateSchema, successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { paramId } from '../lib/params.js';
import {
  approveRoleApplication,
  createRoleApplication,
  getRoleApplicationForUser,
  rejectRoleApplication,
} from '../services/roleApplicationService.js';

export function createRoleApplicationRouter(auth: BookVerseAuth) {
  const router = Router();

  router.post('/', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = roleApplicationCreateSchema.parse(req.body);
      const data = await createRoleApplication(user.id, body);
      res.status(201).json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const data = await getRoleApplicationForUser(paramId(req.params.id), user.id);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/approve', requireAuth(auth), requireRole('ADMIN'), async (req, res, next) => {
    try {
      const admin = (req as AuthedRequest).user;
      const data = await approveRoleApplication(admin.id, paramId(req.params.id));
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/reject', requireAuth(auth), requireRole('ADMIN'), async (req, res, next) => {
    try {
      const admin = (req as AuthedRequest).user;
      const note = typeof req.body?.note === 'string' ? req.body.note : undefined;
      const data = await rejectRoleApplication(admin.id, paramId(req.params.id), note);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
