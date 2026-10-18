import { successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { paramId } from '../lib/params.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { AppError } from '../lib/appError.js';
import { prisma } from '../lib/prisma.js';
import { ensureNotificationPreferences } from '../services/retention/notificationPreferenceService.js';

export function createWishlistRouter(auth: BookVerseAuth) {
  const router = Router();

  router.post('/:bookId', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const bookId = paramId(req.params.bookId);
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: { listings: { where: { status: 'ACTIVE' }, orderBy: { price: 'asc' }, take: 1 } },
      });
      if (!book) {
        throw new AppError('NOT_FOUND', 'Book not found', 404);
      }
      await ensureNotificationPreferences(user.id);
      const price = book.listings[0]?.price ?? '0.00';
      const item = await prisma.wishlistItem.upsert({
        where: { userId_bookId: { userId: user.id, bookId } },
        create: { userId: user.id, bookId, priceAtAdd: price },
        update: {},
      });
      res.status(201).json(successEnvelope(item));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:bookId', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      await prisma.wishlistItem.deleteMany({
        where: { userId: user.id, bookId: paramId(req.params.bookId) },
      });
      res.json(successEnvelope({ removed: true }));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
