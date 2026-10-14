import { normalizeSearchQuery } from '@bookverse/shared';
import type { ApiEnv } from '@bookverse/shared';
import { prisma } from '../../lib/prisma.js';
import { getRedis } from '../../lib/redis.js';
import type { SearchParams, SearchResult, SearchService, SearchSuggest } from './SearchService.js';

const CACHE_TTL_SEC = 60;

type SearchRow = {
  id: string;
  slug: string;
  title: string;
  title_bn: string;
  author: string;
  cover_key: string | null;
  min_price: string | null;
  has_stock: boolean;
  language: string;
  genre_slug: string;
  rank_score: number;
  created_at: Date;
};

function coverUrl(env: ApiEnv, key: string | null): string | null {
  if (!key) return null;
  return `${env.API_ORIGIN.replace(/\/$/, '')}/uploads/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function toCard(env: ApiEnv, row: SearchRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleBn: row.title_bn,
    author: row.author,
    coverUrl: coverUrl(env, row.cover_key),
    minPrice: row.min_price,
    hasStock: row.has_stock,
    language: row.language,
    genreSlug: row.genre_slug,
  };
}

export function createPgSearchService(env: ApiEnv): SearchService {
  return {
    async search(params: SearchParams): Promise<SearchResult> {
      const q = normalizeSearchQuery(params.q);
      if (!q) {
        return { items: [], nextCursor: null };
      }

      const cacheKey = `search:v1:${q}:${params.limit}:${params.cursor ?? ''}`;
      if (!(env.NODE_ENV === 'test' && env.HEALTH_SKIP_INFRA)) {
        try {
          const redis = await getRedis(env);
          const cached = await redis.get(cacheKey);
          if (cached) {
            return JSON.parse(cached) as SearchResult;
          }
        } catch {
          /* cache miss path */
        }
      }

      const likePrefix = `${q}%`;
      const rows = await prisma.$queryRaw<SearchRow[]>`
				WITH active_listings AS (
					SELECT "bookId", MIN(price) AS min_price, BOOL_OR(stock > 0) AS has_stock
					FROM "Listing"
					WHERE status = 'ACTIVE'
					GROUP BY "bookId"
				)
				SELECT
					b.id,
					b.slug,
					b.title,
					b."titleBn" AS title_bn,
					b.author,
					b."coverKey" AS cover_key,
					al.min_price::text,
					COALESCE(al.has_stock, false) AS has_stock,
					b.language,
					g.slug AS genre_slug,
					b."createdAt" AS created_at,
					(
						CASE
							WHEN lower(b.title) = lower(${q}) OR lower(b."titleBn") = lower(${q}) THEN 1000
							WHEN b.title ILIKE ${likePrefix} OR b."titleBn" ILIKE ${likePrefix} THEN 800
							WHEN b.author ILIKE ${likePrefix} THEN 700
							ELSE 0
						END
						+ COALESCE(similarity(b.title, ${q}), 0) * 120
						+ COALESCE(similarity(b."titleBn", ${q}), 0) * 120
						+ COALESCE(similarity(b.author, ${q}), 0) * 80
						+ COALESCE(ts_rank(b."searchVector", plainto_tsquery('simple', ${q})), 0) * 50
					)::float AS rank_score
				FROM "Book" b
				JOIN "Genre" g ON g.id = b."genreId"
				LEFT JOIN active_listings al ON al."bookId" = b.id
				WHERE
					b.title ILIKE ${likePrefix}
					OR b."titleBn" ILIKE ${likePrefix}
					OR b.author ILIKE ${likePrefix}
					OR b.title % ${q}
					OR b."titleBn" % ${q}
					OR b.author % ${q}
					OR b."searchVector" @@ plainto_tsquery('simple', ${q})
				ORDER BY rank_score DESC, b."createdAt" DESC, b.id DESC
				LIMIT ${params.limit + 1}
			`;

      const page = rows.slice(0, params.limit);
      const nextCursor =
        rows.length > params.limit
          ? `${page[page.length - 1]!.created_at.toISOString()}|${page[page.length - 1]!.id}`
          : null;

      const result: SearchResult = {
        items: page.map((r) => toCard(env, r)),
        nextCursor,
      };

      if (!(env.NODE_ENV === 'test' && env.HEALTH_SKIP_INFRA)) {
        try {
          const redis = await getRedis(env);
          await redis.setEx(cacheKey, CACHE_TTL_SEC, JSON.stringify(result));
        } catch {
          /* ignore */
        }
      }

      return result;
    },

    async suggest(q: string): Promise<SearchSuggest> {
      const norm = normalizeSearchQuery(q);
      if (!norm) {
        return { books: [], authors: [], publishers: [] };
      }
      const like = `${norm}%`;

      const books = await prisma.$queryRaw<Array<{ slug: string; title: string; author: string }>>`
				SELECT slug, title, author FROM "Book"
				WHERE title ILIKE ${like} OR "titleBn" ILIKE ${like} OR author ILIKE ${like}
				ORDER BY "createdAt" DESC
				LIMIT 5
			`;

      const authors = await prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
				SELECT author AS name, COUNT(*)::bigint AS count FROM "Book"
				WHERE author ILIKE ${like}
				GROUP BY author
				ORDER BY count DESC
				LIMIT 5
			`;

      const publishers = await prisma.$queryRaw<Array<{ slug: string; name: string }>>`
				SELECT p.slug, p."businessName" AS name
				FROM "PublisherProfile" p
				WHERE p."businessName" ILIKE ${like}
				LIMIT 5
			`;

      return {
        books,
        authors: authors.map((a) => ({ name: a.name, count: Number(a.count) })),
        publishers,
      };
    },
  };
}

export function createSearchService(env: ApiEnv): SearchService {
  if (env.SEARCH_PROVIDER === 'pg') {
    return createPgSearchService(env);
  }
  throw new Error(`Unsupported SEARCH_PROVIDER: ${env.SEARCH_PROVIDER}`);
}
