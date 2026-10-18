import type { ApiEnv } from '@bookverse/shared';
import { Redis } from 'ioredis';
import { prisma } from '../../lib/prisma.js';
import { cursorWhere, encodeCursor } from '../../lib/cursorPagination.js';
import { mapPostsToCards, type PostCard } from './postService.js';

const TRENDING_KEY = 'feed:trending:v1';

function redis(env: ApiEnv) {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

export async function rebuildTrendingCache(env: ApiEnv): Promise<string[]> {
  const rows = await prisma.post.findMany({
    where: { deletedAt: null, hiddenAt: null },
    select: { id: true, likeCount: true, createdAt: true },
    orderBy: [{ likeCount: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  });
  const ids = rows.map((r) => r.id);
  const client = redis(env);
  await client.set(TRENDING_KEY, JSON.stringify(ids), 'EX', 60);
  await client.quit();
  return ids;
}

async function getTrendingIds(env: ApiEnv): Promise<string[] | null> {
  const client = redis(env);
  const raw = await client.get(TRENDING_KEY);
  await client.quit();
  if (!raw) return null;
  return JSON.parse(raw) as string[];
}

async function blockedAuthorIds(viewerId: string | null): Promise<string[]> {
  if (!viewerId) return [];
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  const set = new Set<string>();
  for (const r of rows) {
    set.add(r.blockerId === viewerId ? r.blockedId : r.blockerId);
  }
  return [...set];
}

async function loadViewerMeta(viewerId: string | null, postIds: string[]) {
  if (!viewerId || postIds.length === 0) {
    return { reactions: new Map<string, 'LIKE' | 'DISLIKE'>(), saved: new Set<string>() };
  }
  const [reactions, savedRows] = await Promise.all([
    prisma.reaction.findMany({
      where: { userId: viewerId, targetType: 'POST', targetId: { in: postIds } },
    }),
    prisma.savedPost.findMany({
      where: { userId: viewerId, postId: { in: postIds } },
      select: { postId: true },
    }),
  ]);
  const reactionMap = new Map(reactions.map((r) => [r.targetId, r.kind]));
  return { reactions: reactionMap, saved: new Set(savedRows.map((s) => s.postId)) };
}

function interleaveSponsored(regular: PostCard[], sponsored: PostCard[]): PostCard[] {
  const out: PostCard[] = [];
  let s = 0;
  for (let i = 0; i < regular.length; i++) {
    out.push(regular[i]);
    if ((i + 1) % 6 === 0 && s < sponsored.length) {
      out.push({ ...sponsored[s], isSponsored: true });
      s += 1;
    }
  }
  return out;
}

export async function getFeed(
  env: ApiEnv,
  viewerId: string | null,
  mode: 'following' | 'trending' | 'mixed',
  cursor?: string,
  limit = 15,
): Promise<{ items: PostCard[]; nextCursor: string | null; queryCount: number }> {
  let queryCount = 0;
  const blocked = await blockedAuthorIds(viewerId);
  queryCount += 1;

  const baseWhere = {
    deletedAt: null,
    hiddenAt: null,
    authorId: blocked.length ? { notIn: blocked } : undefined,
    ...(cursorWhere(cursor) ?? {}),
  };

  const take = limit + 1;

  if (mode === 'following') {
    if (!viewerId) {
      return { items: [], nextCursor: null, queryCount };
    }
    const following = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    queryCount += 1;
    const ids = following.map((f) => f.followingId);
    if (ids.length === 0) return { items: [], nextCursor: null, queryCount };

    const rows = await prisma.post.findMany({
      where: { ...baseWhere, authorId: { in: ids } },
      include: { author: { select: { id: true, name: true, displayName: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    });
    queryCount += 1;
    const page = rows.slice(0, limit);
    const meta = await loadViewerMeta(
      viewerId,
      page.map((p) => p.id),
    );
    queryCount += 2;
    const last = page[page.length - 1];
    return {
      items: mapPostsToCards(page, viewerId, meta.reactions, meta.saved),
      nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
      queryCount,
    };
  }

  if (mode === 'trending') {
    let trendingIds = await getTrendingIds(env);
    if (!trendingIds) {
      trendingIds = await rebuildTrendingCache(env);
    }
    queryCount += 1;
    const rows = await prisma.post.findMany({
      where: { id: { in: trendingIds.slice(0, 200) }, deletedAt: null, hiddenAt: null },
      include: { author: { select: { id: true, name: true, displayName: true } } },
    });
    queryCount += 1;
    const order = new Map(trendingIds.map((id, i) => [id, i]));
    rows.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
    const filtered = rows.filter((r) => !blocked.includes(r.authorId));
    const page = filtered.slice(0, limit);
    const meta = await loadViewerMeta(
      viewerId,
      page.map((p) => p.id),
    );
    queryCount += 2;
    return {
      items: mapPostsToCards(page, viewerId, meta.reactions, meta.saved),
      nextCursor: null,
      queryCount,
    };
  }

  // mixed: chronological + sponsored interleave
  const [rows, sponsoredRows] = await Promise.all([
    prisma.post.findMany({
      where: { ...baseWhere, isSponsored: false },
      include: { author: { select: { id: true, name: true, displayName: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    }),
    env.FEATURE_SPONSORED
      ? prisma.post.findMany({
          where: { deletedAt: null, hiddenAt: null, isSponsored: true },
          include: { author: { select: { id: true, name: true, displayName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : Promise.resolve([]),
  ]);
  queryCount += 2;
  const page = rows.slice(0, limit);
  const meta = await loadViewerMeta(
    viewerId,
    [...page, ...sponsoredRows].map((p) => p.id),
  );
  queryCount += 2;
  const regular = mapPostsToCards(page, viewerId, meta.reactions, meta.saved);
  const sponsored = mapPostsToCards(sponsoredRows, viewerId, meta.reactions, meta.saved);
  const items = interleaveSponsored(regular, sponsored);
  const last = page[page.length - 1];
  return {
    items,
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
    queryCount,
  };
}
