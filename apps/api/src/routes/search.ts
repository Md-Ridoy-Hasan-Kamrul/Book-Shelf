import { searchQuerySchema, searchSuggestQuerySchema, successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import type { SearchService } from '../services/search/SearchService.js';

export function createSearchRouter(_env: ApiEnv, search: SearchService) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const query = searchQuerySchema.parse(req.query);
      const data = await search.search(query);
      res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      res.json(successEnvelope(data, { nextCursor: data.nextCursor }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/suggest', async (req, res, next) => {
    try {
      const query = searchSuggestQuerySchema.parse(req.query);
      const data = await search.suggest(query.q);
      res.set('Cache-Control', 'public, max-age=15');
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
