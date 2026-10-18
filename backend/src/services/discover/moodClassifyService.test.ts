import { describe, expect, test } from 'vitest';
import { loadApiEnv } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { createOffLlmProvider } from '../../providers/llm/off.js';
import { classifyMoodText } from './moodClassifyService.js';

describe('classifyMoodText', () => {
  test('rejects when FEATURE_MOOD_LLM is off', async () => {
    const env = {
      ...loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'true' }),
      FEATURE_MOOD_LLM: false,
    };
    await expect(
      classifyMoodText(env, createOffLlmProvider(), 'user-1', 'I feel calm'),
    ).rejects.toBeInstanceOf(AppError);
  });

  test('falls back to rules when LLM is off but feature is on', async () => {
    const env = {
      ...loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'true', LLM_PROVIDER: 'off' }),
      FEATURE_MOOD_LLM: true,
    };
    const out = await classifyMoodText(env, createOffLlmProvider(), 'user-1', 'need romance');
    expect(out.mood).toBe('romantic');
    expect(out.source).toBe('fallback');
  });
});
