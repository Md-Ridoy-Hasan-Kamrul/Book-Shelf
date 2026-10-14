import { successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { assertNoRoleSelfAssign } from '../services/roleApplicationService.js';

/** Profile mutations — never accepts `role` (privilege escalation guard). */
export function createUsersRouter(auth: BookVerseAuth) {
  const router = Router();

  router.patch('/me', requireAuth(auth), (req, res, next) => {
    try {
      assertNoRoleSelfAssign(req.body as Record<string, unknown>);
      const user = (req as AuthedRequest).user;
      res.json(
        successEnvelope({ id: user.id, message: 'Profile update stub — role changes forbidden' }),
      );
    } catch (err) {
      next(err);
    }
  });

  return router;
}
