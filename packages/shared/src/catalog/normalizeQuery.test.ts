import { describe, expect, it } from 'vitest';
import { normalizeSearchQuery } from './normalizeQuery.js';

describe('normalizeSearchQuery', () => {
  it('normalizes Bangla digits', () => {
    expect(normalizeSearchQuery('অ্যাডভেঞ্চার ১২৩')).toBe('অ্যাডভেঞ্চার 123');
  });

  it('collapses whitespace', () => {
    expect(normalizeSearchQuery('  river   notes  ')).toBe('river notes');
  });
});
