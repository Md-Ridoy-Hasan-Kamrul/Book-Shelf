import type { ApiEnv, MeUser } from '@bookverse/shared';
import type { PostType, Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { postCreateSchema, postUpdateSchema } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { computeSpamScore, shouldFlagSpam } from './spamScoreService.js';

type CreateInput = z.infer<typeof postCreateSchema>;

function assertCanPost(user: MeUser) {
  if (user.role === 'USER' && !user.emailVerified) {
    throw new AppError('FORBIDDEN', 'Verify email before posting', 403);
  }
}

export async function createPost(user: MeUser, env: ApiEnv, input: CreateInput) {
  assertCanPost(user);
  if (input.type === 'SPONSORED' && !env.FEATURE_SPONSORED) {
    throw new AppError('FORBIDDEN', 'Sponsored posts disabled', 403);
  }
  if (user.role === 'PUBLISHER' && input.type === 'ANNOUNCEMENT') {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await prisma.post.count({
      where: {
        authorId: user.id,
        type: 'ANNOUNCEMENT',
        createdAt: { gte: since },
        deletedAt: null,
      },
    });
    if (count >= 3) {
      throw new AppError('RATE_LIMITED', 'Publisher announcements capped at 3 per day', 429);
    }
  }

  const recentDupes = await prisma.post.count({
    where: {
      authorId: user.id,
      body: input.body,
      createdAt: { gte: new Date(Date.now() - 3600_000) },
    },
  });
  const spamScore = computeSpamScore(input.body, recentDupes);
  if (shouldFlagSpam(spamScore)) {
    throw new AppError('SPAM_SUSPECT', 'Post flagged for review — try again later', 403);
  }

  const isSponsored = input.type === 'SPONSORED';
  return prisma.post.create({
    data: {
      authorId: user.id,
      type: input.type as PostType,
      body: input.body,
      bookId: input.bookId,
      hasSpoiler: input.hasSpoiler,
      imageKeys: input.imageKeys,
      isSponsored,
      campaignId: input.campaignId,
    },
  });
}

export async function updatePost(
  user: MeUser,
  postId: string,
  input: z.infer<typeof postUpdateSchema>,
) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.deletedAt) throw new AppError('NOT_FOUND', 'Post not found', 404);
  if (post.authorId !== user.id && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
    throw new AppError('FORBIDDEN', 'Not your post', 403);
  }
  return prisma.post.update({
    where: { id: postId },
    data: {
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.hasSpoiler !== undefined ? { hasSpoiler: input.hasSpoiler } : {}),
    },
  });
}

export async function softDeletePost(user: MeUser, postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.deletedAt) throw new AppError('NOT_FOUND', 'Post not found', 404);
  if (post.authorId !== user.id && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
    throw new AppError('FORBIDDEN', 'Not your post', 403);
  }
  await prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
}

export async function savePost(userId: string, postId: string) {
  await prisma.savedPost.upsert({
    where: { userId_postId: { userId, postId } },
    create: { userId, postId },
    update: {},
  });
}

export async function unsavePost(userId: string, postId: string) {
  await prisma.savedPost.deleteMany({ where: { userId, postId } });
}

export type PostCard = {
  id: string;
  type: string;
  body: string;
  hasSpoiler: boolean;
  isSponsored: boolean;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  authorName: string;
  authorId: string;
  bookId: string | null;
  imageKeys: string[];
  createdAt: string;
  viewerReaction: 'LIKE' | 'DISLIKE' | null;
  saved: boolean;
};

export function mapPostsToCards(
  rows: Array<
    Prisma.PostGetPayload<{
      include: { author: { select: { id: true; name: true; displayName: true } } };
    }>
  >,
  viewerId: string | null,
  reactions: Map<string, 'LIKE' | 'DISLIKE'>,
  saved: Set<string>,
): PostCard[] {
  return rows.map((p) => ({
    id: p.id,
    type: p.type,
    body: p.body,
    hasSpoiler: p.hasSpoiler,
    isSponsored: p.isSponsored,
    likeCount: p.likeCount,
    dislikeCount: p.dislikeCount,
    commentCount: p.commentCount,
    authorId: p.authorId,
    authorName: p.author.displayName ?? p.author.name,
    bookId: p.bookId,
    imageKeys: p.imageKeys,
    createdAt: p.createdAt.toISOString(),
    viewerReaction: viewerId ? (reactions.get(p.id) ?? null) : null,
    saved: saved.has(p.id),
  }));
}
