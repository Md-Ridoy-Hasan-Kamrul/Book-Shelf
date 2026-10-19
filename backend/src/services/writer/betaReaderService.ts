import type { MeUser } from '@bookverse/shared';
import type { z } from 'zod';
import type { betaProgramCreateSchema } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { awardPoints } from '../points/awardPoints.js';
import { enqueueNotification } from '../../jobs/notificationQueue.js';
import type { ApiEnv } from '@bookverse/shared';
import { computeEligibilityScore } from './eligibilityScore.js';

type CreateInput = z.infer<typeof betaProgramCreateSchema>;

export async function createBetaProgram(env: ApiEnv, host: MeUser, input: CreateInput) {
  if (host.role !== 'WRITER' && host.role !== 'PUBLISHER' && host.role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Writer or publisher role required', 403);
  }
  const book = await prisma.book.findUnique({ where: { id: input.bookId } });
  if (!book) throw new AppError('NOT_FOUND', 'Book not found', 404);

  const program = await prisma.betaReaderProgram.create({
    data: {
      hostId: host.id,
      bookId: input.bookId,
      title: input.title,
      deadline: new Date(input.deadline),
      requiredReviews: input.requiredReviews,
      rewardPoints: input.rewardPoints,
      minEligibilityScore: input.minEligibilityScore,
    },
  });

  const invites = [];
  for (const userId of input.inviteUserIds) {
    const elig = await computeEligibilityScore(userId);
    if (elig.score < input.minEligibilityScore) continue;
    try {
      const invite = await prisma.betaReaderInvite.create({
        data: {
          programId: program.id,
          userId,
          eligibility: elig.score,
        },
      });
      invites.push(invite);
      await enqueueNotification(env, {
        userId,
        dedupeKey: `beta-invite:${program.id}:${userId}`,
        title: 'Beta reader invite',
        body: `You're invited to beta-read “${input.title}” (deadline ${input.deadline.slice(0, 10)}).`,
      }).catch(() => undefined);
    } catch {
      /* duplicate invite */
    }
  }

  return { program, invited: invites.length, skipped: input.inviteUserIds.length - invites.length };
}

export async function respondToInvite(userId: string, inviteId: string, accept: boolean) {
  const invite = await prisma.betaReaderInvite.findUnique({
    where: { id: inviteId },
    include: { program: true },
  });
  if (!invite || invite.userId !== userId) {
    throw new AppError('NOT_FOUND', 'Invite not found', 404);
  }
  if (invite.status !== 'PENDING') {
    throw new AppError('CONFLICT', 'Invite already responded', 409);
  }
  if (invite.program.deadline < new Date()) {
    await prisma.betaReaderInvite.update({
      where: { id: inviteId },
      data: { status: 'EXPIRED' },
    });
    throw new AppError('VALIDATION_ERROR', 'Program deadline passed', 400);
  }

  return prisma.betaReaderInvite.update({
    where: { id: inviteId },
    data: {
      status: accept ? 'ACCEPTED' : 'DECLINED',
      respondedAt: new Date(),
    },
  });
}

/** Called when a beta reader submits a qualifying review for the program book. */
export async function recordBetaReview(env: ApiEnv, userId: string, bookId: string) {
  const invites = await prisma.betaReaderInvite.findMany({
    where: {
      userId,
      status: 'ACCEPTED',
      program: { bookId, active: true, deadline: { gte: new Date() } },
    },
    include: { program: true },
  });

  for (const invite of invites) {
    const reviewsDone = invite.reviewsDone + 1;
    if (reviewsDone >= invite.program.requiredReviews) {
      await prisma.betaReaderInvite.update({
        where: { id: invite.id },
        data: { reviewsDone, status: 'COMPLETED', completedAt: new Date() },
      });
      await awardPoints(userId, 'BETA_READER_REWARD', invite.id, invite.program.rewardPoints, {
        note: `Beta reader reward: ${invite.program.title}`,
      });
      await enqueueNotification(env, {
        userId,
        dedupeKey: `beta-complete:${invite.id}`,
        title: 'Beta reward credited',
        body: `+${invite.program.rewardPoints} points for completing “${invite.program.title}”.`,
      }).catch(() => undefined);
    } else {
      await prisma.betaReaderInvite.update({
        where: { id: invite.id },
        data: { reviewsDone },
      });
    }
  }
}

export async function listMyBetaInvites(userId: string) {
  return prisma.betaReaderInvite.findMany({
    where: { userId },
    include: {
      program: {
        select: {
          id: true,
          title: true,
          deadline: true,
          requiredReviews: true,
          rewardPoints: true,
          bookId: true,
        },
      },
    },
    orderBy: { invitedAt: 'desc' },
    take: 50,
  });
}
