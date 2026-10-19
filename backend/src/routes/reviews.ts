import {
  reportCreateSchema,
  reviewCreateSchema,
  reviewListQuerySchema,
  successEnvelope,
} from '@bookverse/shared';
import { Router } from 'express';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { paramId } from '../lib/params.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import type { ApiEnv } from '@bookverse/shared';
import {
  afterReviewCreated,
  createReview,
  listBookReviews,
  markReviewHelpful,
  reportReview,
} from '../services/retention/reviewService.js';

export function createReviewsRouter(auth: BookVerseAuth, env?: ApiEnv) {
  const router = Router();

  router.get('/books/:bookId', async (req, res, next) => {
    try {
      const q = reviewListQuerySchema.parse(req.query);
      const data = await listBookReviews(paramId(req.params.bookId), q.cursor, q.limit);
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.post('/books/:bookId', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = reviewCreateSchema.parse(req.body);
      const bookId = paramId(req.params.bookId);
      const data = await createReview(user.id, bookId, body);
      if (env) await afterReviewCreated(env, user.id, bookId);
      res.status(201).json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/helpful', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      await markReviewHelpful(user.id, paramId(req.params.id));
      res.json(successEnvelope({ helpful: true }));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/report', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = reportCreateSchema.parse(req.body);
      await reportReview(user.id, paramId(req.params.id), body.reason);
      res.status(201).json(successEnvelope({ reported: true }));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
