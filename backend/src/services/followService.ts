import type { UserRole } from '@bookverse/shared';
import type { ApiEnv } from '@bookverse/shared';
import { AppError } from '../lib/appError.js';
import { canFollow } from '../policies/canFollow.js';
import { prisma } from '../lib/prisma.js';

async function isBlocked(a: string, b: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(block);
}

async function loadFollowUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, bannedAt: true, deletedAt: true },
  });
  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }
  return { ...user, role: user.role as UserRole };
}

export async function followUser(env: ApiEnv, actorId: string, targetId: string) {
  const [actor, target] = await Promise.all([loadFollowUser(actorId), loadFollowUser(targetId)]);
  const blocked = await isBlocked(actor.id, target.id);
  const decision = canFollow(actor, target, { blocked });
  if (!decision.allowed) {
    throw new AppError('FORBIDDEN', `Cannot follow: ${decision.reason}`, 403);
  }

  return prisma.$transaction(async (tx) => {
    const stillBlocked = await tx.block.findFirst({
      where: {
        OR: [
          { blockerId: actor.id, blockedId: target.id },
          { blockerId: target.id, blockedId: actor.id },
        ],
      },
      select: { id: true },
    });
    if (stillBlocked) {
      throw new AppError('FORBIDDEN', 'Cannot follow: BLOCKED', 403);
    }

    await tx.follow.upsert({
      where: { followerId_followingId: { followerId: actor.id, followingId: target.id } },
      create: { followerId: actor.id, followingId: target.id },
      update: {},
    });

    if (actor.role === 'USER' && target.role === 'WRITER') {
      await tx.follow.upsert({
        where: { followerId_followingId: { followerId: target.id, followingId: actor.id } },
        create: { followerId: target.id, followingId: actor.id },
        update: {},
      });
    }

    return { following: true };
  });
}

export async function unfollowUser(_env: ApiEnv, actorId: string, targetId: string) {
  const target = await loadFollowUser(targetId);

  return prisma.$transaction(async (tx) => {
    await tx.follow.deleteMany({
      where: { followerId: actorId, followingId: targetId },
    });

    if (target.role === 'WRITER') {
      await tx.follow.deleteMany({
        where: { followerId: targetId, followingId: actorId },
      });
    }

    return { following: false };
  });
}
