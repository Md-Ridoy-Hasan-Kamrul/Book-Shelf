import {
  discoverConfigSchema,
  moodClassifyBodySchema,
  moodClassifyResultSchema,
  moodDiscoverQuerySchema,
  moodDiscoverResultSchema,
  moodLogBodySchema,
  recommendResultSchema,
  successEnvelope,
} from '@bookverse/shared';
import { Router } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import type { LlmProvider } from '../providers/llm/types.js';
import type { StorageProvider } from '../providers/storage/types.js';
import { classifyMoodText } from '../services/discover/moodClassifyService.js';
import {
  discoverByMood,
  getDiscoverConfig,
  logMoodWithConsent,
} from '../services/discover/moodDiscoveryService.js';
import { getRecommendations } from '../services/discover/recommendationService.js';

export function createDiscoverRouter(
  auth: BookVerseAuth,
  env: ApiEnv,
  storage: StorageProvider,
  llm: LlmProvider,
) {
  const router = Router();

  router.get('/config', (_req, res) => {
    const data = getDiscoverConfig(env.FEATURE_MOOD_LLM);
    res.json(successEnvelope(discoverConfigSchema.parse(data)));
  });

  router.get('/mood', async (req, res, next) => {
    try {
      const query = moodDiscoverQuerySchema.parse(req.query);
      const data = await discoverByMood(env, storage, query);
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      res.json(
        successEnvelope(moodDiscoverResultSchema.parse(data), { nextCursor: data.nextCursor }),
      );
    } catch (err) {
      next(err);
    }
  });

  router.get('/recommend', optionalAuth(auth), async (req, res, next) => {
    try {
      const userId = (req as AuthedRequest).user?.id ?? null;
      const data = await getRecommendations(env, storage, userId);
      res.json(successEnvelope(recommendResultSchema.parse(data)));
    } catch (err) {
      next(err);
    }
  });

  router.post('/mood/log', requireAuth(auth), async (req, res, next) => {
    try {
      const body = moodLogBodySchema.parse(req.body);
      const user = (req as AuthedRequest).user;
      const row = await logMoodWithConsent(user.id, body.mood, body.source);
      res.status(201).json(successEnvelope(row));
    } catch (err) {
      next(err);
    }
  });

  router.post('/mood/classify', requireAuth(auth), async (req, res, next) => {
    try {
      const body = moodClassifyBodySchema.parse(req.body);
      const user = (req as AuthedRequest).user;
      const data = await classifyMoodText(env, llm, user.id, body.text);
      res.json(successEnvelope(moodClassifyResultSchema.parse(data)));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
