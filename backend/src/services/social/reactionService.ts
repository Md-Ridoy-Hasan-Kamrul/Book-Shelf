import type { ReactionKind } from '@prisma/client';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';

export async function setPostReaction(userId: string, postId: string, kind: ReactionKind) {
  await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt || post.hiddenAt) {
      throw new AppError('NOT_FOUND', 'Post not found', 404);
    }

    const existing = await tx.reaction.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: 'POST', targetId: postId } },
    });

    if (existing?.kind === kind) {
      await tx.reaction.delete({ where: { id: existing.id } });
      await tx.post.update({
        where: { id: postId },
        data:
          kind === 'LIKE' ? { likeCount: { decrement: 1 } } : { dislikeCount: { decrement: 1 } },
      });
      return;
    }

    if (existing) {
      await tx.reaction.update({ where: { id: existing.id }, data: { kind } });
      if (existing.kind === 'LIKE' && kind === 'DISLIKE') {
        await tx.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 }, dislikeCount: { increment: 1 } },
        });
      } else if (existing.kind === 'DISLIKE' && kind === 'LIKE') {
        await tx.post.update({
          where: { id: postId },
          data: { dislikeCount: { decrement: 1 }, likeCount: { increment: 1 } },
        });
      }
      return;
    }

    await tx.reaction.create({
      data: { userId, targetType: 'POST', targetId: postId, kind },
    });
    await tx.post.update({
      where: { id: postId },
      data: kind === 'LIKE' ? { likeCount: { increment: 1 } } : { dislikeCount: { increment: 1 } },
    });
  });
}
