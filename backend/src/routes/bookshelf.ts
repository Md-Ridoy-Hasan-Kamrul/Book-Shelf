import {
  bookshelfUpsertSchema,
  pointHistoryQuerySchema,
  readingGoalUpdateSchema,
  successEnvelope,
} from '@bookverse/shared';
import type { ApiEnv } from '@bookverse/shared';
import { Router } from 'express';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import {
  getOrCreateReadingGoal,
  listBookshelf,
  setReadingGoal,
  upsertBookshelfItem,
} from '../services/bookshelf/bookshelfService.js';
import { listUserBadges } from '../services/points/badgeService.js';
import { listPointHistory } from '../services/points/pointHistoryService.js';

export function createBookshelfRouter(auth: BookVerseAuth, env: ApiEnv) {
  const router = Router();

  router.get('/', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const data = await listBookshelf(user.id);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.put('/items', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = bookshelfUpsertSchema.parse(req.body);
      const data = await upsertBookshelfItem(user, env, body);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.get('/goal', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const goal = await getOrCreateReadingGoal(user.id);
      res.json(
        successEnvelope({
          year: goal.year,
          targetBooks: goal.targetBooks,
          completedBooks: goal.completedBooks,
        }),
      );
    } catch (err) {
      next(err);
    }
  });

  router.put('/goal', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = readingGoalUpdateSchema.parse(req.body);
      const goal = await setReadingGoal(user.id, body.targetBooks, body.year);
      res.json(
        successEnvelope({
          year: goal.year,
          targetBooks: goal.targetBooks,
          completedBooks: goal.completedBooks,
        }),
      );
    } catch (err) {
      next(err);
    }
  });

  router.get('/points', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const q = pointHistoryQuerySchema.parse(req.query);
      const data = await listPointHistory(user.id, q.cursor, q.limit);
      res.json(
        successEnvelope(
          { pointsBalance: data.pointsBalance, items: data.items },
          { nextCursor: data.nextCursor },
        ),
      );
    } catch (err) {
      next(err);
    }
  });

  router.get('/badges', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const data = await listUserBadges(user.id);
      res.json(successEnvelope({ items: data }));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
