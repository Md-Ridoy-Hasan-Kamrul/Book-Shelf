import { describe, expect, test } from 'vitest';

/** Pure scoring mirror of eligibilityScore factors (not review-count alone). */
function scoreFromFactors(input: {
  verifiedPurchases: number;
  helpfulVotes: number;
  badgeCount: number;
  moderationWarnings: number;
  reportsAgainst: number;
  banned: boolean;
}) {
  const purchasePts = Math.min(input.verifiedPurchases, 20) * 10;
  const helpfulPts = Math.min(input.helpfulVotes, 50) * 2;
  const badgePts = Math.min(input.badgeCount, 5) * 15;
  const abuseScore =
    input.moderationWarnings * 10 + input.reportsAgainst * 15 + (input.banned ? 100 : 0);
  return Math.max(0, purchasePts + helpfulPts + badgePts - abuseScore);
}

describe('beta eligibility score', () => {
  test('rewards purchases + helpfulness + badges, not raw review count', () => {
    const highHelpful = scoreFromFactors({
      verifiedPurchases: 3,
      helpfulVotes: 20,
      badgeCount: 2,
      moderationWarnings: 0,
      reportsAgainst: 0,
      banned: false,
    });
    const manyReviewsButNoSignal = scoreFromFactors({
      verifiedPurchases: 0,
      helpfulVotes: 0,
      badgeCount: 0,
      moderationWarnings: 0,
      reportsAgainst: 0,
      banned: false,
    });
    expect(highHelpful).toBeGreaterThan(manyReviewsButNoSignal);
    expect(highHelpful).toBe(30 + 40 + 30);
  });

  test('abuse penalty lowers score', () => {
    const clean = scoreFromFactors({
      verifiedPurchases: 5,
      helpfulVotes: 10,
      badgeCount: 1,
      moderationWarnings: 0,
      reportsAgainst: 0,
      banned: false,
    });
    const abusive = scoreFromFactors({
      verifiedPurchases: 5,
      helpfulVotes: 10,
      badgeCount: 1,
      moderationWarnings: 3,
      reportsAgainst: 2,
      banned: false,
    });
    expect(abusive).toBeLessThan(clean);
  });
});
