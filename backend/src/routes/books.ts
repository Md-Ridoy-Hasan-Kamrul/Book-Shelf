import { bookDetailSchema, booksListQuerySchema, successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import { getBookBySlug, listBooks } from '../services/bookCatalogService.js';
import { pdfReadOnlyHeaders, readBookPdf } from '../services/bookPdfService.js';
import type { StorageProvider } from '../providers/storage/types.js';
import { paramId } from '../lib/params.js';
import { AppError } from '../lib/appError.js';

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

  /** Read-only stream: Content-Disposition inline (not attachment). */
  router.get('/:slug/pdf', async (req, res, next) => {
    try {
      const slug = paramId(req.params.slug);
      const file = await readBookPdf(slug);
      if (!file) {
        throw new AppError('NOT_FOUND', 'PDF not found', 404);
      }
      const headers = pdfReadOnlyHeaders(file.filename, file.data.byteLength);
      for (const [k, v] of Object.entries(headers)) {
        res.setHeader(k, v);
      }
      res.status(200).send(file.data);
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
