import { describe, expect, test } from 'vitest';
import { classifyMoodByRules } from './ruleMoodClassify.js';

describe('classifyMoodByRules', () => {
  test('maps romance keywords to romantic', () => {
    expect(classifyMoodByRules('looking for love and romance')).toBe('romantic');
  });

  test('maps bangla calm keywords', () => {
    expect(classifyMoodByRules('আজকে একটু শান্ত বই চাই')).toBe('calm');
  });

  test('defaults to curious when no keyword matches', () => {
    expect(classifyMoodByRules('xyz abc')).toBe('curious');
  });
});
