import {
  createBookListingSchema,
  lookInsideSubmitSchema,
  successEnvelope,
  updateListingStockSchema,
} from '@bookverse/shared';
import { Router } from 'express';
import multer from 'multer';
import type { ApiEnv } from '@bookverse/shared';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { assertImageUpload } from '../lib/uploadValidation.js';
import { paramId } from '../lib/params.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import type { StorageProvider } from '../providers/storage/types.js';
import {
  approveLookInside,
  createBookWithListing,
  submitLookInside,
  updateListingStock,
  uploadBookCover,
} from '../services/sellerCatalogService.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } });

export function createSellerRouter(auth: BookVerseAuth, env: ApiEnv, storage: StorageProvider) {
  const router = Router();

  router.post('/books', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = createBookListingSchema.parse(req.body);
      const data = await createBookWithListing(user, body);
      res.status(201).json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/listings/:id/stock', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = updateListingStockSchema.parse(req.body);
      const data = await updateListingStock(user, paramId(req.params.id), body.stock);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/books/:bookId/cover',
    requireAuth(auth),
    upload.single('cover'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const file = req.file;
        if (!file) {
          res
            .status(400)
            .json({ success: false, code: 'VALIDATION_ERROR', message: 'Missing cover file' });
          return;
        }
        assertImageUpload(file.mimetype, file.size, env.UPLOAD_MAX_BYTES);
        const data = await uploadBookCover(
          user,
          paramId(req.params.bookId),
          storage,
          file.buffer,
          file.mimetype,
        );
        res.json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/books/:bookId/look-inside',
    requireAuth(auth),
    upload.array('pages', 10),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        lookInsideSubmitSchema.parse({
          copyrightConfirmed:
            req.body?.copyrightConfirmed === 'true' || req.body?.copyrightConfirmed === true,
        });
        const files = (req.files ?? []) as Express.Multer.File[];
        if (!files?.length) {
          res
            .status(400)
            .json({ success: false, code: 'VALIDATION_ERROR', message: 'Missing pages' });
          return;
        }
        for (const f of files) {
          assertImageUpload(f.mimetype, f.size, env.UPLOAD_MAX_BYTES);
        }
        const data = await submitLookInside(
          user,
          paramId(req.params.bookId),
          storage,
          files.map((f) => ({ buffer: f.buffer, contentType: f.mimetype })),
          true,
        );
        res.status(201).json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/admin/look-inside/:bookId/approve',
    requireAuth(auth),
    requireRole('ADMIN'),
    async (req, res, next) => {
      try {
        const admin = (req as AuthedRequest).user;
        const data = await approveLookInside(admin.id, paramId(req.params.bookId));
        res.json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
