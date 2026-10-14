import type { Prisma } from '@prisma/client';
import { AppError } from '../lib/appError.js';
import { prisma } from '../lib/prisma.js';

async function removeFollowEdges(tx: Prisma.TransactionClient, a: string, b: string) {
  await tx.follow.deleteMany({
    where: {
      OR: [
        { followerId: a, followingId: b },
        { followerId: b, followingId: a },
      ],
    },
  });
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) {
    throw new AppError('VALIDATION_ERROR', 'Cannot block yourself', 400);
  }

  const target = await prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } });
  if (!target) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  return prisma.$transaction(async (tx) => {
    await removeFollowEdges(tx, blockerId, blockedId);
    await tx.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
    return { blocked: true };
  });
}
