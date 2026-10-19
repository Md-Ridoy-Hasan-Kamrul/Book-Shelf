import type { ApiEnv, UserRole } from '@bookverse/shared';
import { AppError } from '../lib/appError.js';
import { canFollow } from '../policies/canFollow.js';
import { prisma } from '../lib/prisma.js';

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

/**
 * Mass-follow raises COD risk (lowers trustScore). Never auto-bans (Appendix B §4).
 */
export async function bumpMassFollowRisk(userId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, trustScore: { gt: 0 } },
    data: { trustScore: { decrement: 1 } },
  });
}

/**
 * Follow write — policy check (incl. writer follow-back) and insert in ONE transaction.
 */
export async function followUser(_env: ApiEnv, actorId: string, targetId: string) {
  const [actor, target] = await Promise.all([loadFollowUser(actorId), loadFollowUser(targetId)]);

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

    // Target already follows actor? Required for WRITER → USER follow-back.
    const reverse = await tx.follow.findUnique({
      where: {
        followerId_followingId: { followerId: target.id, followingId: actor.id },
      },
      select: { id: true },
    });

    const decision = canFollow(actor, target, {
      blocked: Boolean(stillBlocked),
      actorIsFollowedByTarget: Boolean(reverse),
    });
    if (!decision.allow) {
      throw new AppError('FORBIDDEN', `Cannot follow: ${decision.code}`, 403);
    }

    await tx.follow.upsert({
      where: { followerId_followingId: { followerId: actor.id, followingId: target.id } },
      create: { followerId: actor.id, followingId: target.id },
      update: {},
    });

    return { following: true };
  });
}

export async function unfollowUser(_env: ApiEnv, actorId: string, targetId: string) {
  const target = await loadFollowUser(targetId);

  return prisma.$transaction(async (tx) => {
    await tx.follow.deleteMany({
      where: { followerId: actorId, followingId: targetId },
    });

    // Invariant: a writer only follows users who follow them (Appendix B §2)
    if (target.role === 'WRITER') {
      await tx.follow.deleteMany({
        where: { followerId: targetId, followingId: actorId },
      });
    }

    return { following: false };
  });
}
