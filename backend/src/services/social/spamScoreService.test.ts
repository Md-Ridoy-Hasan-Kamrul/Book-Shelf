import { describe, expect, it } from 'vitest';
import { computeSpamScore, shouldFlagSpam } from './spamScoreService.js';

describe('spamScoreService', () => {
  it('flags duplicate mass text', () => {
    const score = computeSpamScore('buy now http://a.com http://b.com http://c.com', 3);
    expect(shouldFlagSpam(score)).toBe(true);
  });
});
