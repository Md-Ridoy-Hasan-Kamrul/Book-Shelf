import type { ApiEnv, MoodEnum } from '@bookverse/shared';
import type { z } from 'zod';
import type { moodDiscoverQuerySchema } from '@bookverse/shared';
import { prisma } from '../../lib/prisma.js';
import type { StorageProvider } from '../../providers/storage/types.js';
import { DISCLAIMER, IN_STOCK_LISTING, MOOD_LABELS } from './moodLabels.js';

type MoodQuery = z.infer<typeof moodDiscoverQuerySchema>;

function coverUrl(env: ApiEnv, storage: StorageProvider, key: string | null) {
  if (!key) return null;
  return storage.resolvePublicUrl(key);
}

export function getDiscoverConfig(featureMoodLlm: boolean) {
  return {
    moods: (Object.keys(MOOD_LABELS) as MoodEnum[]).map((id) => ({
      id,
      label: MOOD_LABELS[id].label,
      labelBn: MOOD_LABELS[id].labelBn,
    })),
    featureMoodLlm,
    disclaimer: DISCLAIMER,
  };
}

export async function logMoodWithConsent(
  userId: string,
  mood: MoodEnum,
  source: 'chip' | 'llm' | 'fallback',
) {
  return prisma.moodLog.create({
    data: { userId, mood, source },
    select: { id: true, mood: true, source: true, createdAt: true },
  });
}

export async function discoverByMood(env: ApiEnv, storage: StorageProvider, query: MoodQuery) {
  const take = query.limit + 1;
  const cursorParts = query.cursor?.split('|');
  const cursorCreatedAt = cursorParts?.[0];
  const cursorId = cursorParts?.[1];

  const books = await prisma.book.findMany({
    where: {
      moodTags: { has: query.mood },
      listings: { some: IN_STOCK_LISTING },
      ...(query.minPages != null || query.maxPages != null
        ? {
            pageCount: {
              ...(query.minPages != null ? { gte: query.minPages } : {}),
              ...(query.maxPages != null ? { lte: query.maxPages } : {}),
            },
          }
        : {}),
      ...(cursorCreatedAt && cursorId
        ? {
            OR: [
              { createdAt: { lt: new Date(cursorCreatedAt) } },
              { createdAt: new Date(cursorCreatedAt), id: { lt: cursorId } },
            ],
          }
        : {}),
    },
    include: {
      genre: { select: { slug: true } },
      listings: {
        where: IN_STOCK_LISTING,
        select: { price: true, stock: true },
      },
      _count: { select: { wishlist: true, reviews: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take * 3,
  });

  let mapped = books
    .map((b) => {
      const prices = b.listings.map((l) => Number(l.price));
      const minPrice = prices.length ? Math.min(...prices).toFixed(2) : null;
      if (!b.listings.some((l) => l.stock > 0)) return null;
      if (query.minPrice != null && minPrice != null && Number(minPrice) < query.minPrice) {
        return null;
      }
      if (query.maxPrice != null && minPrice != null && Number(minPrice) > query.maxPrice) {
        return null;
      }
      const popularity = b._count.wishlist + b._count.reviews * 2;
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
        moodTags: b.moodTags,
        pageCount: b.pageCount,
        popularity,
        createdAt: b.createdAt,
      };
    })
    .filter(Boolean) as Array<{
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
    popularity: number;
    createdAt: Date;
  }>;

  if (query.sort === 'popularity') {
    mapped.sort(
      (a, b) => b.popularity - a.popularity || b.createdAt.getTime() - a.createdAt.getTime(),
    );
  } else if (query.sort === 'price_asc' || query.sort === 'price_desc') {
    mapped.sort((a, b) => {
      const pa = a.minPrice ? Number(a.minPrice) : Number.POSITIVE_INFINITY;
      const pb = b.minPrice ? Number(b.minPrice) : Number.POSITIVE_INFINITY;
      return query.sort === 'price_asc' ? pa - pb : pb - pa;
    });
  } else {
    mapped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  mapped = mapped.slice(0, take);
  const page = mapped.slice(0, query.limit);
  const last = page[page.length - 1];
  const nextCursor =
    mapped.length > query.limit && last ? `${last.createdAt.toISOString()}|${last.id}` : null;

  return {
    disclaimer: DISCLAIMER,
    mood: query.mood,
    items: page.map(({ popularity: _p, createdAt: _c, ...rest }) => rest),
    nextCursor,
  };
}
