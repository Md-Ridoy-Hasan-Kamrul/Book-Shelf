import {
  campaignCreateSchema,
  campaignInvoiceCreateSchema,
  campaignMetricsSchema,
  campaignTrackBodySchema,
  featurePostBodySchema,
  featureReviewBodySchema,
  offerCreateSchema,
  releaseUpsertSchema,
  reprintDemandQuerySchema,
  reprintRequestBodySchema,
  serverTimeSchema,
  successEnvelope,
} from '@bookverse/shared';
import { Router } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { AppError } from '../lib/appError.js';
import { paramId } from '../lib/params.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  createCampaign,
  createManualInvoice,
  getCampaignMetrics,
  getEligibleSponsored,
  listOwnedCampaigns,
  trackCampaignEvent,
} from '../services/publisher/campaignService.js';
import { featurePost, featureReview } from '../services/publisher/featureService.js';
import { createOffer } from '../services/publisher/offerService.js';
import {
  getReleasePublic,
  notifyMe,
  serverNowIso,
  upsertRelease,
} from '../services/publisher/releaseService.js';
import { getReprintDemand, requestReprint } from '../services/publisher/reprintService.js';

function requireSponsored(env: ApiEnv) {
  return (_req: unknown, _res: unknown, next: (err?: unknown) => void) => {
    if (!env.FEATURE_SPONSORED) {
      next(new AppError('FORBIDDEN', 'Sponsored / publisher growth module is disabled', 403));
      return;
    }
    next();
  };
}

export function createPublisherRouter(auth: BookVerseAuth, env: ApiEnv) {
  const router = Router();
  router.use(requireSponsored(env));

  router.get('/time', (_req, res) => {
    res.json(successEnvelope(serverTimeSchema.parse({ serverNow: serverNowIso() })));
  });

  router.get('/sponsored', optionalAuth(auth), async (req, res, next) => {
    try {
      const viewerId = (req as AuthedRequest).user?.id ?? null;
      const genreId = typeof req.query.genreId === 'string' ? req.query.genreId : undefined;
      const data = await getEligibleSponsored(env, viewerId, genreId);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/track', optionalAuth(auth), async (req, res, next) => {
    try {
      const body = campaignTrackBodySchema.parse(req.body);
      const userId = (req as AuthedRequest).user?.id ?? null;
      const data = await trackCampaignEvent(env, userId, body.trackingId, body.kind, {
        amountBdt: body.amountBdt,
        orderId: body.orderId,
      });
      res.status(201).json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/campaigns',
    requireAuth(auth),
    requireRole('PUBLISHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const body = campaignCreateSchema.parse(req.body);
        const data = await createCampaign(user.id, user.role, body);
        res.status(201).json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/campaigns',
    requireAuth(auth),
    requireRole('PUBLISHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const data = await listOwnedCampaigns(user.id);
        res.json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/campaigns/:id/metrics',
    requireAuth(auth),
    requireRole('PUBLISHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const data = await getCampaignMetrics(user.id, paramId(req.params.id));
        res.json(successEnvelope(campaignMetricsSchema.parse(data)));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/campaigns/:id/invoice',
    requireAuth(auth),
    requireRole('PUBLISHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const body = campaignInvoiceCreateSchema.parse(req.body);
        const data = await createManualInvoice(
          user.id,
          paramId(req.params.id),
          body.amountBdt,
          body.note,
        );
        res.status(201).json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post('/books/:bookId/reprint', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = reprintRequestBodySchema.parse(req.body ?? {});
      const data = await requestReprint(user.id, paramId(req.params.bookId), body);
      res.status(201).json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/reprint-demand',
    requireAuth(auth),
    requireRole('PUBLISHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const q = reprintDemandQuerySchema.parse(req.query);
        const data = await getReprintDemand(user.id, q);
        res.json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/releases',
    requireAuth(auth),
    requireRole('PUBLISHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const body = releaseUpsertSchema.parse(req.body);
        const data = await upsertRelease(user.id, user.role, body);
        res.status(201).json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/releases/:bookId', async (req, res, next) => {
    try {
      const data = await getReleasePublic(paramId(req.params.bookId));
      if (!data) {
        throw new AppError('NOT_FOUND', 'Release not found', 404);
      }
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/releases/:bookId/notify-me', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const data = await notifyMe(env, user.id, paramId(req.params.bookId));
      res.status(201).json(successEnvelope({ id: data.id }));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/offers',
    requireAuth(auth),
    requireRole('PUBLISHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const body = offerCreateSchema.parse(req.body);
        const data = await createOffer(user.id, user.role, body);
        res.status(201).json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/feature/review',
    requireAuth(auth),
    requireRole('PUBLISHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const body = featureReviewBodySchema.parse(req.body);
        const data = await featureReview(env, user.id, user.role, body.reviewId);
        res.json(successEnvelope({ id: data.id, featuredAt: data.featuredAt }));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/feature/post',
    requireAuth(auth),
    requireRole('PUBLISHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const body = featurePostBodySchema.parse(req.body);
        const data = await featurePost(env, user.id, user.role, body.postId);
        res.json(successEnvelope({ id: data.id, featuredAt: data.featuredAt }));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
