import type { ApiEnv } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { consumeRateLimit } from '../../lib/rateLimit.js';
import { getRedis } from '../../lib/redis.js';
import type { LlmProvider } from '../../providers/llm/types.js';
import { classifyMoodByRules } from './ruleMoodClassify.js';

const CLASSIFY_CACHE_TTL = 600;

export async function classifyMoodText(
  env: ApiEnv,
  llm: LlmProvider,
  userId: string,
  text: string,
) {
  if (!env.FEATURE_MOOD_LLM) {
    throw new AppError('FORBIDDEN', 'Mood LLM classify is disabled', 403);
  }

  await consumeRateLimit(env, `mood-llm:${userId}`, 10, 3600);

  const cacheKey = `mood-classify:${userId}:${Buffer.from(text).toString('base64url').slice(0, 64)}`;
  if (!(env.NODE_ENV === 'test' && env.HEALTH_SKIP_INFRA)) {
    try {
      const redis = await getRedis(env);
      const hit = await redis.get(cacheKey);
      if (hit) {
        const parsed = JSON.parse(hit) as { mood: string; source: string; model: string | null };
        return parsed;
      }
    } catch {
      /* continue without cache */
    }
  }

  let result: { mood: string; source: 'llm' | 'fallback'; model: string | null };

  try {
    const llmOut = await llm.classifyMood({ text, model: env.LLM_MODEL });
    if (llmOut) {
      result = { mood: llmOut.mood, source: 'llm', model: llmOut.model };
    } else {
      result = { mood: classifyMoodByRules(text), source: 'fallback', model: null };
    }
  } catch {
    result = { mood: classifyMoodByRules(text), source: 'fallback', model: null };
  }

  if (!(env.NODE_ENV === 'test' && env.HEALTH_SKIP_INFRA)) {
    try {
      const redis = await getRedis(env);
      await redis.set(cacheKey, JSON.stringify(result), { EX: CLASSIFY_CACHE_TTL });
    } catch {
      /* ignore */
    }
  }

  return result;
}
