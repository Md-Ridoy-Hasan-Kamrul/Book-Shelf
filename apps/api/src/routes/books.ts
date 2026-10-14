import { bookDetailSchema, booksListQuerySchema, successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import { getBookBySlug, listBooks } from '../services/bookCatalogService.js';
import type { StorageProvider } from '../providers/storage/types.js';
import { paramId } from '../lib/params.js';

export function createBooksRouter(env: ApiEnv, storage: StorageProvider) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const query = booksListQuerySchema.parse(req.query);
      const data = await listBooks(env, storage, query, env.FEATURE_USED_BOOKS);
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:slug', async (req, res, next) => {
    try {
      const slug = paramId(req.params.slug);
      const data = await getBookBySlug(env, storage, slug);
      res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
      res.json(successEnvelope(bookDetailSchema.parse(data)));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
