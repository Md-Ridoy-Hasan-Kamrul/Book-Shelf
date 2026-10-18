import type { MeUser } from '@bookverse/shared';
import type { z } from 'zod';
import type { commentCreateSchema } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';

type CreateInput = z.infer<typeof commentCreateSchema>;

export async function createComment(user: MeUser, postId: string, input: CreateInput) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.deletedAt || post.hiddenAt) {
    throw new AppError('NOT_FOUND', 'Post not found', 404);
  }

  if (input.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.postId !== postId) {
      throw new AppError('VALIDATION_ERROR', 'Invalid reply parent', 400);
    }
    if (parent.parentId) {
      throw new AppError('VALIDATION_ERROR', 'Only one level of replies allowed', 400);
    }
  }

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        postId,
        authorId: user.id,
        body: input.body,
        parentId: input.parentId,
        hasSpoiler: input.hasSpoiler,
      },
    });
    await tx.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });
    return comment;
  });
}

export async function listPostComments(postId: string) {
  const rows = await prisma.comment.findMany({
    where: { postId, deletedAt: null, hiddenAt: null, parentId: null },
    include: {
      author: { select: { name: true, displayName: true } },
      replies: {
        where: { deletedAt: null, hiddenAt: null },
        include: { author: { select: { name: true, displayName: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((c) => ({
    id: c.id,
    body: c.body,
    hasSpoiler: c.hasSpoiler,
    authorName: c.author.displayName ?? c.author.name,
    createdAt: c.createdAt.toISOString(),
    replies: c.replies.map((r) => ({
      id: r.id,
      body: r.body,
      hasSpoiler: r.hasSpoiler,
      authorName: r.author.displayName ?? r.author.name,
      createdAt: r.createdAt.toISOString(),
    })),
  }));
}
