import type { BadgeType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

async function grant(userId: string, type: BadgeType) {
  await prisma.userBadge.upsert({
    where: { userId_type: { userId, type } },
    create: { userId, type },
    update: {},
  });
}

/** Nightly job: compute badges from ledger + reviews (no auto points). */
export async function recomputeBadges(): Promise<{ scanned: number; granted: number }> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, bannedAt: null },
    select: { id: true },
  });
  let granted = 0;

  for (const { id: userId } of users) {
    const before = await prisma.userBadge.count({ where: { userId } });

    const finished = await prisma.bookshelfItem.count({
      where: { userId, status: 'READ' },
    });
    if (finished >= 10) await grant(userId, 'BOOKWORM');

    const reviews = await prisma.review.count({ where: { userId } });
    if (reviews >= 5) await grant(userId, 'TOP_REVIEWER');

    const genres = await prisma.review.findMany({
      where: { userId },
      select: { book: { select: { genreId: true } } },
      take: 100,
    });
    const genreSet = new Set(genres.map((g) => g.book.genreId).filter(Boolean));
    if (genreSet.size >= 4) await grant(userId, 'GENRE_EXPLORER');

    const early = await prisma.review.count({
      where: {
        userId,
        isVerifiedBuyer: true,
        createdAt: { lte: new Date(Date.now() - 0) },
      },
    });
    // Early Reader: reviewed a book within 14 days of first listing/publish heuristic —
    // use verified buyer reviews as proxy for early engagement.
    if (early >= 1) await grant(userId, 'EARLY_READER');

    const helpful = await prisma.review.aggregate({
      where: { userId },
      _sum: { helpfulCount: true },
    });
    if ((helpful._sum.helpfulCount ?? 0) >= 10) await grant(userId, 'COMMUNITY_STAR');

    const after = await prisma.userBadge.count({ where: { userId } });
    granted += Math.max(0, after - before);
  }

  return { scanned: users.length, granted };
}

export async function listUserBadges(userId: string) {
  const rows = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { awardedAt: 'asc' },
  });
  return rows.map((r) => ({
    type: r.type,
    awardedAt: r.awardedAt.toISOString(),
  }));
}
