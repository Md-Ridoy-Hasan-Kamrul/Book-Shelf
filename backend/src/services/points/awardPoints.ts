import type { PointLedgerKind, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/appError.js';

export type PointReason =
  | 'PURCHASE_DELIVERED'
  | 'FIRST_REVIEW'
  | 'FINISH_BOOK'
  | 'GOAL_COMPLETE'
  | 'HELPFUL_VOTE'
  | 'BETA_READER_REWARD'
  | 'REDEEM'
  | 'ADJUSTMENT';

/**
 * Sole writer of User.pointsBalance (AGENTS golden rule + P12).
 * Idempotent on (userId, reason, refId).
 */
export async function awardPoints(
  userId: string,
  reason: PointReason,
  refId: string,
  delta: number,
  opts?: {
    kind?: PointLedgerKind;
    note?: string;
    tx?: Prisma.TransactionClient;
  },
): Promise<{ awarded: boolean; pointsBalance: number }> {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new AppError('VALIDATION_ERROR', 'Point delta must be a non-zero integer', 400);
  }

  const kind: PointLedgerKind =
    opts?.kind ?? (delta > 0 ? 'EARN' : delta < 0 ? 'REDEEM' : 'ADJUSTMENT');
  const idempotencyKey = `${reason}:${refId}`;

  const run = async (tx: Prisma.TransactionClient) => {
    const existing = await tx.pointLedger.findUnique({
      where: { userId_reason_refId: { userId, reason, refId } },
    });
    if (existing) {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { pointsBalance: true },
      });
      return { awarded: false, pointsBalance: user.pointsBalance };
    }

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { pointsBalance: true },
    });
    if (delta < 0 && user.pointsBalance + delta < 0) {
      throw new AppError('VALIDATION_ERROR', 'Insufficient points', 400);
    }

    const balanceAfter = user.pointsBalance + delta;

    await tx.pointLedger.create({
      data: {
        userId,
        delta,
        kind,
        reason,
        refId,
        balanceAfter,
        idempotencyKey,
        note: opts?.note,
      },
    });

    const updated = await tx.user.update({
      where: { id: userId },
      data: { pointsBalance: balanceAfter },
      select: { pointsBalance: true },
    });

    return { awarded: true, pointsBalance: updated.pointsBalance };
  };

  if (opts?.tx) return run(opts.tx);
  return prisma.$transaction(run);
}
