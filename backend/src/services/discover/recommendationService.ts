import type { ApiEnv } from '@bookverse/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { getRedis } from '../../lib/redis.js';
import type { StorageProvider } from '../../providers/storage/types.js';
import { getSystemSetting } from '../settings/systemSettingsService.js';
import { IN_STOCK_LISTING } from './moodLabels.js';

const CACHE_TTL_SEC = 600;
const MAX_PER_AUTHOR = 5;
const SECTION_SIZE = 12;

type Weights = {
  genre: number;
  author: number;
  publisher: number;
  wishlist: number;
  purchase: number;
  shelf: number;
  follow: number;
  popularity: number;
  freshness: number;
};

const DEFAULT_WEIGHTS: Weights = {
  genre: 3,
  author: 4,
  publisher: 2,
  wishlist: 3,
  purchase: 5,
  shelf: 4,
  follow: 2,
  popularity: 1.5,
  freshness: 1,
};

type Card = {
  id: string;
  slug: string;
  title: string;
  titleBn: string;
  author: string;
  coverUrl: string | null;
  minPrice: string | null;
  hasStock: true;
  language: string;
  genreSlug: string;
  moodTags: string[];
  pageCount: number | null;
  why?: string;
};

function coverUrl(env: ApiEnv, storage: StorageProvider, key: string | null) {
  if (!key) return null;
  return storage.resolvePublicUrl(key);
}

function diversifyByAuthor<T extends { author: string }>(items: T[], limit: number): T[] {
  const counts = new Map<string, number>();
  const out: T[] = [];
  for (const item of items) {
    const n = counts.get(item.author) ?? 0;
    if (n >= MAX_PER_AUTHOR) continue;
    counts.set(item.author, n + 1);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

async function loadInStockCandidates(env: ApiEnv, storage: StorageProvider, take = 200) {
  const books = await prisma.book.findMany({
    where: { listings: { some: IN_STOCK_LISTING } },
    include: {
      genre: { select: { id: true, slug: true, name: true } },
      publisher: { select: { id: true, slug: true } },
      writer: { select: { id: true, userId: true } },
      listings: { where: IN_STOCK_LISTING, select: { price: true, stock: true } },
      _count: { select: { wishlist: true, reviews: true, orderLineItems: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });

  return books
    .filter((b) => b.listings.some((l) => l.stock > 0))
    .map((b) => {
      const prices = b.listings.map((l) => Number(l.price));
      const minPrice = prices.length ? Math.min(...prices).toFixed(2) : null;
      const popularity = b._count.wishlist + b._count.reviews * 2 + b._count.orderLineItems;
      const ageDays = Math.max(0, (Date.now() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: b.id,
        slug: b.slug,
        title: b.title,
        titleBn: b.titleBn,
        author: b.author,
        coverUrl: coverUrl(env, storage, b.coverKey),
        minPrice,
        hasStock: true as const,
        language: b.language,
        genreSlug: b.genre.slug,
        genreId: b.genre.id,
        genreName: b.genre.name,
        publisherId: b.publisher?.id ?? null,
        writerUserId: b.writer?.userId ?? null,
        moodTags: b.moodTags,
        pageCount: b.pageCount,
        popularity,
        freshness: 1 / (1 + ageDays / 30),
        createdAt: b.createdAt,
      };
    });
}

type Candidate = Awaited<ReturnType<typeof loadInStockCandidates>>[number];

function toCard(c: Candidate, why?: string): Card {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    titleBn: c.titleBn,
    author: c.author,
    coverUrl: c.coverUrl,
    minPrice: c.minPrice,
    hasStock: true,
    language: c.language,
    genreSlug: c.genreSlug,
    moodTags: c.moodTags,
    pageCount: c.pageCount,
    ...(why ? { why } : {}),
  };
}

async function buildAffinity(userId: string) {
  const [shelf, wishlist, purchases, follows] = await Promise.all([
    prisma.bookshelfItem.findMany({
      where: { userId },
      select: {
        book: {
          select: {
            id: true,
            author: true,
            genreId: true,
            publisherId: true,
            title: true,
          },
        },
      },
      take: 100,
    }),
    prisma.wishlistItem.findMany({
      where: { userId },
      select: {
        book: {
          select: { id: true, author: true, genreId: true, publisherId: true },
        },
      },
      take: 100,
    }),
    prisma.orderLineItem.findMany({
      where: { order: { buyerId: userId, status: 'DELIVERED' } },
      select: {
        book: {
          select: { id: true, author: true, genreId: true, publisherId: true, title: true },
        },
      },
      take: 100,
    }),
    prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
      take: 100,
    }),
  ]);

  const genreScore = new Map<string, number>();
  const authorScore = new Map<string, number>();
  const publisherScore = new Map<string, number>();
  const seenBookIds = new Set<string>();
  let becauseTitle: string | null = null;

  const bump = (map: Map<string, number>, key: string | null | undefined, w: number) => {
    if (!key) return;
    map.set(key, (map.get(key) ?? 0) + w);
  };

  for (const row of shelf) {
    seenBookIds.add(row.book.id);
    bump(genreScore, row.book.genreId, 1);
    bump(authorScore, row.book.author, 1);
    bump(publisherScore, row.book.publisherId, 1);
    if (!becauseTitle) becauseTitle = row.book.title;
  }
  for (const row of wishlist) {
    seenBookIds.add(row.book.id);
    bump(genreScore, row.book.genreId, 1);
    bump(authorScore, row.book.author, 1);
    bump(publisherScore, row.book.publisherId, 1);
  }
  for (const row of purchases) {
    seenBookIds.add(row.book.id);
    bump(genreScore, row.book.genreId, 1);
    bump(authorScore, row.book.author, 1);
    bump(publisherScore, row.book.publisherId, 1);
    if (!becauseTitle) becauseTitle = row.book.title;
  }

  const followIds = follows.map((f) => f.followingId);
  return {
    genreScore,
    authorScore,
    publisherScore,
    seenBookIds,
    followIds,
    becauseTitle,
    shelfCount: shelf.length,
    wishlistCount: wishlist.length,
    purchaseCount: purchases.length,
  };
}

async function alsoFollowSuggestions(followIds: string[], limit: number) {
  if (followIds.length === 0) return [];
  const rows = await prisma.$queryRaw<Array<{ userId: string; name: string; cnt: bigint }>>`
    SELECT f."followingId" AS "userId", u.name AS name, COUNT(*)::bigint AS cnt
    FROM "Follow" f
    INNER JOIN "User" u ON u.id = f."followingId"
    WHERE f."followerId" IN (
      SELECT "followerId" FROM "Follow" WHERE "followingId" IN (${Prisma.join(followIds)})
    )
    AND f."followingId" NOT IN (${Prisma.join(followIds)})
    AND u."deletedAt" IS NULL
    AND u."bannedAt" IS NULL
    GROUP BY f."followingId", u.name
    ORDER BY cnt DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    count: Number(r.cnt),
  }));
}

function scoreCandidate(
  c: Candidate,
  affinity: Awaited<ReturnType<typeof buildAffinity>>,
  weights: Weights,
) {
  let score = 0;
  const reasons: string[] = [];
  const g = affinity.genreScore.get(c.genreId) ?? 0;
  if (g > 0) {
    score += g * weights.genre;
    reasons.push(`genre:${c.genreName}`);
  }
  const a = affinity.authorScore.get(c.author) ?? 0;
  if (a > 0) {
    score += a * weights.author;
    reasons.push(`author:${c.author}`);
  }
  if (c.publisherId) {
    const p = affinity.publisherScore.get(c.publisherId) ?? 0;
    if (p > 0) {
      score += p * weights.publisher;
      reasons.push('publisher match');
    }
  }
  if (affinity.wishlistCount > 0) score += weights.wishlist * 0.1;
  if (affinity.purchaseCount > 0) score += weights.purchase * 0.1;
  if (affinity.shelfCount > 0) score += weights.shelf * 0.1;
  if (c.writerUserId && affinity.followIds.includes(c.writerUserId)) {
    score += weights.follow;
    reasons.push('followed writer');
  }
  score += c.popularity * weights.popularity * 0.05;
  score += c.freshness * weights.freshness;
  return { score, why: reasons[0] ? `Matched on ${reasons[0]}` : 'Popular & in stock' };
}

export async function getRecommendations(
  env: ApiEnv,
  storage: StorageProvider,
  userId: string | null,
) {
  const cacheKey = userId ? `recommend:user:${userId}` : 'recommend:anon';
  if (!(env.NODE_ENV === 'test' && env.HEALTH_SKIP_INFRA)) {
    try {
      const redis = await getRedis(env);
      const hit = await redis.get(cacheKey);
      if (hit) {
        const parsed = JSON.parse(hit) as { sections: unknown[] };
        return { cached: true, sections: parsed.sections };
      }
    } catch {
      /* miss */
    }
  }

  const weights = await getSystemSetting<Weights>('recommend_weights', DEFAULT_WEIGHTS);
  const candidates = await loadInStockCandidates(env, storage);

  let sections: Array<{ key: string; title: string; items: Card[] }>;

  if (!userId) {
    const trending = diversifyByAuthor(
      [...candidates].sort((a, b) => b.popularity - a.popularity),
      SECTION_SIZE,
    ).map((c) => toCard(c, 'Trending & in stock'));
    sections = [
      { key: 'forYou', title: 'Recommended for you', items: trending },
      { key: 'trendingGenres', title: 'Trending in your genres', items: trending.slice(0, 8) },
    ];
  } else {
    const affinity = await buildAffinity(userId);
    const unscored = candidates.filter((c) => !affinity.seenBookIds.has(c.id));
    const scored = unscored
      .map((c) => {
        const { score, why } = scoreCandidate(c, affinity, weights);
        return { c, score, why };
      })
      .sort((a, b) => b.score - a.score);

    const forYouScored = diversifyByAuthor(
      scored.map((s) => ({ ...s.c, why: s.why })),
      SECTION_SIZE,
    );
    const forYou = forYouScored.map((c) => toCard(c, c.why));

    const becauseTitle = affinity.becauseTitle ?? 'your recent reads';
    const becausePool = scored.filter((s) => (affinity.genreScore.get(s.c.genreId) ?? 0) > 0);
    const becauseYouRead = diversifyByAuthor(
      becausePool.map((s) => s.c),
      SECTION_SIZE,
    ).map((c) => toCard(c, `Because you read ${becauseTitle}`));

    const topGenres = [...affinity.genreScore.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
    const trendingGenres = diversifyByAuthor(
      unscored
        .filter((c) => topGenres.length === 0 || topGenres.includes(c.genreId))
        .sort((a, b) => b.popularity - a.popularity),
      SECTION_SIZE,
    ).map((c) => toCard(c, `Trending in ${c.genreName}`));

    const alsoFollow = await alsoFollowSuggestions(affinity.followIds, 8);
    const alsoFollowItems: Card[] = [];
    if (alsoFollow.length > 0) {
      const writerUserIds = alsoFollow.map((a) => a.userId);
      const writerBooks = candidates.filter(
        (c) => c.writerUserId && writerUserIds.includes(c.writerUserId),
      );
      alsoFollowItems.push(
        ...diversifyByAuthor(writerBooks, 8).map((c) => {
          const match = alsoFollow.find((a) => a.userId === c.writerUserId);
          return toCard(
            c,
            match
              ? `Readers who follow others also follow ${match.name}`
              : 'Also followed by similar readers',
          );
        }),
      );
    }

    sections = [
      { key: 'forYou', title: 'Recommended for you', items: forYou },
      {
        key: 'becauseYouRead',
        title: `Because you read ${becauseTitle}`,
        items: becauseYouRead,
      },
      { key: 'trendingGenres', title: 'Trending in your genres', items: trendingGenres },
      {
        key: 'alsoFollow',
        title: 'Readers who follow X also follow Y',
        items: alsoFollowItems,
      },
    ].filter((s) => s.items.length > 0);
  }

  const payload = { cached: false, sections };

  if (!(env.NODE_ENV === 'test' && env.HEALTH_SKIP_INFRA)) {
    try {
      const redis = await getRedis(env);
      await redis.set(cacheKey, JSON.stringify({ sections }), { EX: CACHE_TTL_SEC });
    } catch {
      /* ignore */
    }
  }

  return payload;
}
