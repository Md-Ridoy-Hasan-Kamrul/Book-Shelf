import { successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { consumeRateLimit } from '../lib/rateLimit.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';

/** Post creation rate limit (full feed API lands in a later prompt). */
export function createPostsRouter(auth: BookVerseAuth, env: ApiEnv) {
  const router = Router();

  router.post('/', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      await consumeRateLimit(env, `rl:post:${user.id}`, 30, 3600);
      res
        .status(501)
        .json(
          successEnvelope({
            stub: true,
            message: 'Post creation API not implemented yet (P social)',
          }),
        );
    } catch (err) {
      next(err);
    }
  });

  return router;
}
