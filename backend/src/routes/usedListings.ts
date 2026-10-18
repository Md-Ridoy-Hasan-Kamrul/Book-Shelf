import {
  reportCreateSchema,
  sellerRatingCreateSchema,
  successEnvelope,
  usedListingCreateSchema,
  usedNearMeQuerySchema,
} from '@bookverse/shared';
import type { ApiEnv } from '@bookverse/shared';
import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { AppError } from '../lib/appError.js';
import { assertImageUpload } from '../lib/uploadValidation.js';
import { optimizePreviewImage } from '../lib/optimizePreviewImage.js';
import { paramId } from '../lib/params.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import type { StorageProvider } from '../providers/storage/types.js';
import {
  createUsedListing,
  listNearMe,
  listPendingUsedListings,
  moderateUsedListing,
  rateSellerAfterDelivery,
  reportUsedListing,
} from '../services/used/usedListingService.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } });

export function createUsedListingsRouter(
  auth: BookVerseAuth,
  env: ApiEnv,
  storage: StorageProvider,
) {
  const router = Router();

  router.use((req, _res, next) => {
    if (!env.FEATURE_USED_BOOKS) {
      next(new AppError('FORBIDDEN', 'Used books module is disabled', 403));
      return;
    }
    next();
  });

  router.get('/near-me', async (req, res, next) => {
    try {
      const q = usedNearMeQuerySchema.parse(req.query);
      const data = await listNearMe(env, q.district, q.area, q.cursor, q.limit);
      res.json(successEnvelope({ items: data.items }, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.post('/photos', requireAuth(auth), upload.array('photos', 8), async (req, res, next) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files?.length) throw new AppError('VALIDATION_ERROR', 'No photos uploaded', 400);
      const keys: string[] = [];
      for (const file of files) {
        assertImageUpload(file.mimetype, file.size, env.UPLOAD_MAX_BYTES);
        const optimized = await optimizePreviewImage(file.buffer);
        const key = `used/${randomUUID()}.webp`;
        await storage.put(key, optimized, 'image/webp');
        keys.push(key);
      }
      res.status(201).json(successEnvelope({ photoKeys: keys }));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = usedListingCreateSchema.parse(req.body);
      const data = await createUsedListing(user, env, body);
      res.status(201).json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/report', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = reportCreateSchema.parse(req.body);
      await reportUsedListing(user.id, paramId(req.params.id), body.reason);
      res.status(201).json(successEnvelope({ reported: true }));
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/moderation/queue',
    requireAuth(auth),
    requireRole('ADMIN', 'MODERATOR'),
    async (_req, res, next) => {
      try {
        const rows = await listPendingUsedListings();
        res.json(successEnvelope({ items: rows }));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/:id/moderate',
    requireAuth(auth),
    requireRole('ADMIN', 'MODERATOR'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const approve = Boolean((req.body as { approve?: boolean })?.approve);
        const data = await moderateUsedListing(user.id, paramId(req.params.id), approve);
        res.json(successEnvelope({ id: data.id, status: data.status }));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

export function createSellerRatingRouter(auth: BookVerseAuth, env: ApiEnv) {
  const router = Router();

  router.post('/:orderId/seller-rating', requireAuth(auth), async (req, res, next) => {
    try {
      if (!env.FEATURE_USED_BOOKS) {
        throw new AppError('FORBIDDEN', 'Used books module is disabled', 403);
      }
      const user = (req as AuthedRequest).user;
      const body = sellerRatingCreateSchema.parse(req.body);
      const data = await rateSellerAfterDelivery(
        user.id,
        paramId(req.params.orderId),
        body.rating,
        body.body,
      );
      res.status(201).json(successEnvelope({ id: data.id }));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
