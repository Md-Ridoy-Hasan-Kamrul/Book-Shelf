import { successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import { paramId } from '../lib/params.js';
import { getPublisherBySlug } from '../services/publisher/publisherProfileService.js';

/** Public publisher profiles (not gated by FEATURE_SPONSORED). */
export function createPublishersPublicRouter() {
  const router = Router();

  router.get('/:slug', async (req, res, next) => {
    try {
      const data = await getPublisherBySlug(paramId(req.params.slug));
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
