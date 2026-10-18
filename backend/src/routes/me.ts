import { meResponseSchema, successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';

export function createMeRouter(auth: BookVerseAuth) {
  const router = Router();

  router.get('/', requireAuth(auth), (req, res) => {
    const user = (req as AuthedRequest).user;
    const payload = meResponseSchema.parse({ user });
    res.json(successEnvelope(payload));
  });

  return router;
}
