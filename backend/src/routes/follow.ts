import { successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { clientIp, consumeRateLimit } from '../lib/rateLimit.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { paramId } from '../lib/params.js';
import { blockUser } from '../services/blockService.js';
import { bumpMassFollowRisk, followUser, unfollowUser } from '../services/followService.js';

/** Follows in a 1h window above this raise trustScore risk (never auto-ban). */
const MASS_FOLLOW_RISK_THRESHOLD = 25;

export function createFollowRouter(auth: BookVerseAuth, env: ApiEnv) {
  const router = Router();

  router.post('/:id/follow', requireAuth(auth), async (req, res, next) => {
    try {
      const actor = (req as AuthedRequest).user;
      const count = await consumeRateLimit(env, `rl:follow:${actor.id}`, 50, 3600);
      const data = await followUser(env, actor.id, paramId(req.params.id));
      if (count > MASS_FOLLOW_RISK_THRESHOLD) {
        await bumpMassFollowRisk(actor.id);
      }
      res.status(201).json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/block', requireAuth(auth), async (req, res, next) => {
    try {
      const actor = (req as AuthedRequest).user;
      const data = await blockUser(actor.id, paramId(req.params.id));
      res.status(201).json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id/follow', requireAuth(auth), async (req, res, next) => {
    try {
      const actor = (req as AuthedRequest).user;
      const data = await unfollowUser(env, actor.id, paramId(req.params.id));
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createAuthRateLimitMiddleware(env: ApiEnv) {
  return async (
    req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    const path = req.path;
    const ip = clientIp(req);
    try {
      if (path.endsWith('/sign-in/email')) {
        await consumeRateLimit(env, `rl:login:${ip}`, 5, 60);
      } else if (path.endsWith('/sign-up/email')) {
        await consumeRateLimit(env, `rl:signup:${ip}`, 10, 3600);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
