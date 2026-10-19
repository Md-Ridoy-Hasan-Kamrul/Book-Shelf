import {
  betaInviteRespondSchema,
  betaProgramCreateSchema,
  eligibilityBreakdownSchema,
  liveBanBodySchema,
  liveEventCreateSchema,
  liveEventUpdateSchema,
  liveQuestionCreateSchema,
  successEnvelope,
  writerProfileUpdateSchema,
} from '@bookverse/shared';
import { Router } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { AppError } from '../lib/appError.js';
import { paramId } from '../lib/params.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  createBetaProgram,
  listMyBetaInvites,
  respondToInvite,
} from '../services/writer/betaReaderService.js';
import { computeEligibilityScore } from '../services/writer/eligibilityScore.js';
import {
  banFromEvent,
  createLiveEvent,
  enqueueQuestion,
  getLiveEvent,
  listUpcomingEvents,
  updateLiveEvent,
} from '../services/writer/liveEventService.js';
import { getWriterBySlug, updateWriterProfile } from '../services/writer/writerProfileService.js';

function requireLive(env: ApiEnv) {
  return (_req: unknown, _res: unknown, next: (err?: unknown) => void) => {
    if (!env.FEATURE_LIVE_EVENTS) {
      next(new AppError('FORBIDDEN', 'Live events / writer tools module is disabled', 403));
      return;
    }
    next();
  };
}

export function createWriterRouter(auth: BookVerseAuth, env: ApiEnv) {
  const router = Router();
  router.use(requireLive(env));

  router.get('/profiles/:slug', async (req, res, next) => {
    try {
      const data = await getWriterBySlug(paramId(req.params.slug));
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    '/me/profile',
    requireAuth(auth),
    requireRole('WRITER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const body = writerProfileUpdateSchema.parse(req.body);
        const data = await updateWriterProfile(user.id, user.role, body);
        res.json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/eligibility/:userId', requireAuth(auth), async (req, res, next) => {
    try {
      const data = await computeEligibilityScore(paramId(req.params.userId));
      res.json(successEnvelope(eligibilityBreakdownSchema.parse(data)));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/beta-programs',
    requireAuth(auth),
    requireRole('WRITER', 'PUBLISHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const body = betaProgramCreateSchema.parse(req.body);
        const data = await createBetaProgram(env, user, body);
        res.status(201).json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/beta-invites', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const data = await listMyBetaInvites(user.id);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/beta-invites/:id/respond', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = betaInviteRespondSchema.parse(req.body);
      const data = await respondToInvite(user.id, paramId(req.params.id), body.accept);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.get('/events', async (_req, res, next) => {
    try {
      const data = await listUpcomingEvents();
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/events',
    requireAuth(auth),
    requireRole('WRITER', 'PUBLISHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const body = liveEventCreateSchema.parse(req.body);
        const data = await createLiveEvent(user, body);
        res.status(201).json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/events/:id', async (req, res, next) => {
    try {
      const data = await getLiveEvent(paramId(req.params.id));
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    '/events/:id',
    requireAuth(auth),
    requireRole('WRITER', 'PUBLISHER', 'ADMIN', 'MODERATOR'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const body = liveEventUpdateSchema.parse(req.body);
        const data = await updateLiveEvent(user, paramId(req.params.id), body);
        res.json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post('/events/:id/questions', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = liveQuestionCreateSchema.parse(req.body);
      const data = await enqueueQuestion(user.id, paramId(req.params.id), body.body);
      res.status(201).json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/events/:id/ban',
    requireAuth(auth),
    requireRole('WRITER', 'PUBLISHER', 'ADMIN', 'MODERATOR'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const body = liveBanBodySchema.parse(req.body);
        const data = await banFromEvent(user, paramId(req.params.id), body.userId, body.reason);
        res.json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
