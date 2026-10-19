import { prisma } from '../../lib/prisma.js';

/**
 * Beta-reader eligibility — not review count alone.
 * Factors: verified purchases, review helpfulness, badges, low abuse.
 */
export async function computeEligibilityScore(userId: string) {
  const [verifiedPurchases, helpfulAgg, badgeCount, user, reportsAgainst] = await Promise.all([
    prisma.order.count({
      where: { buyerId: userId, status: 'DELIVERED' },
    }),
    prisma.review.aggregate({
      where: { userId, isVerifiedBuyer: true },
      _sum: { helpfulCount: true },
    }),
    prisma.userBadge.count({ where: { userId } }),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { moderationWarnings: true, bannedAt: true },
    }),
    prisma.report.count({
      where: {
        targetType: 'USER',
        targetId: userId,
        status: { in: ['OPEN', 'REVIEWING', 'RESOLVED'] },
      },
    }),
  ]);

  const helpfulVotes = helpfulAgg._sum.helpfulCount ?? 0;
  const abuseScore = user.moderationWarnings * 10 + reportsAgainst * 15 + (user.bannedAt ? 100 : 0);

  const purchasePts = Math.min(verifiedPurchases, 20) * 10;
  const helpfulPts = Math.min(helpfulVotes, 50) * 2;
  const badgePts = Math.min(badgeCount, 5) * 15;
  const abusePenalty = abuseScore;

  const score = Math.max(0, purchasePts + helpfulPts + badgePts - abusePenalty);

  return {
    score,
    verifiedPurchases,
    helpfulVotes,
    badgeCount,
    abuseScore,
    factors: { purchasePts, helpfulPts, badgePts, abusePenalty },
  };
}
