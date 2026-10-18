import { describe, expect, test } from 'vitest';
import {
  moodClassifyBodySchema,
  moodDiscoverQuerySchema,
  moodEnumSchema,
  moodLogBodySchema,
} from './schemas.js';

describe('discover schemas', () => {
  test('accepts ten moods', () => {
    expect(moodEnumSchema.options).toHaveLength(10);
  });

  test('mood discover query requires mood', () => {
    expect(moodDiscoverQuerySchema.parse({ mood: 'curious' }).sort).toBe('popularity');
    expect(() => moodDiscoverQuerySchema.parse({ mood: 'angry' })).toThrow();
  });

  test('mood log requires consent true', () => {
    expect(moodLogBodySchema.parse({ mood: 'happy', consent: true }).source).toBe('chip');
    expect(() => moodLogBodySchema.parse({ mood: 'happy', consent: false })).toThrow();
  });

  test('classify body trims text', () => {
    expect(moodClassifyBodySchema.parse({ text: '  hello world  ' }).text).toBe('hello world');
  });
});
