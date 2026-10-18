import { isbnParamSchema, successEnvelope } from '@bookverse/shared';
import type { ApiEnv } from '@bookverse/shared';
import { Router } from 'express';
import { AppError } from '../lib/appError.js';
import { lookupIsbn } from '../services/used/isbnLookupService.js';

export function createIsbnRouter(env: ApiEnv) {
  const router = Router();

  router.get('/:isbn', async (req, res, next) => {
    try {
      if (!env.FEATURE_USED_BOOKS) {
        throw new AppError('FORBIDDEN', 'Used books module is disabled', 403);
      }
      const { isbn } = isbnParamSchema.parse({ isbn: req.params.isbn });
      const data = await lookupIsbn(isbn);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
