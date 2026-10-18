import type { LlmProvider } from './types.js';

export function createOffLlmProvider(): LlmProvider {
  return {
    kind: 'off',
    async classifyMood() {
      return null;
    },
  };
}
