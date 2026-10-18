import type { ApiEnv } from '@bookverse/shared';
import { createMockLlmProvider } from './mock.js';
import { createOffLlmProvider } from './off.js';
import type { LlmProvider } from './types.js';

export type { LlmProvider } from './types.js';

export function createLlmProvider(env: ApiEnv): LlmProvider {
  if (env.LLM_PROVIDER === 'mock') {
    return createMockLlmProvider();
  }
  return createOffLlmProvider();
}
