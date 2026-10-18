import { describe, expect, test } from 'vitest';
import { createMockLlmProvider } from './mock.js';
import { createOffLlmProvider } from './off.js';

describe('LlmProvider', () => {
  test('off provider returns null', async () => {
    const llm = createOffLlmProvider();
    expect(await llm.classifyMood({ text: 'happy day', model: 'x' })).toBeNull();
  });

  test('mock provider classifies keyword text', async () => {
    const llm = createMockLlmProvider();
    const out = await llm.classifyMood({ text: 'want an adventure', model: 'mock-mood-v1' });
    expect(out?.mood).toBe('adventurous');
    expect(out?.model).toBe('mock-mood-v1');
  });

  test('mock provider returns null without keywords', async () => {
    const llm = createMockLlmProvider();
    expect(await llm.classifyMood({ text: 'zzzz', model: 'm' })).toBeNull();
  });
});
