import type { ApiEnv } from '@bookverse/shared';
import type { MeUser } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { appNow } from '../../lib/clock.js';
import { getSystemSetting } from '../settings/systemSettingsService.js';
import { transitionOrderStatus } from '../order/orderStateMachine.js';
import { createRefundLedgerForOrder } from './ledgerService.js';

export async function openOrderClaim(
  user: MeUser,
  orderId: string,
  reason: string,
  images: string[],
  env: ApiEnv,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId: user.id },
    include: { claim: true },
  });
  if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
  if (order.status !== 'DELIVERED') {
    throw new AppError('VALIDATION_ERROR', 'Claims only on delivered orders', 400);
  }
  if (order.claim) throw new AppError('CONFLICT', 'Claim already exists', 409);

  const windowDays = await getSystemSetting<number>('claim_window_days', 3);
  const windowHours = await getSystemSetting<number>('claim_window_hours', windowDays * 24);
  const deliveredAt = order.deliveredAt ?? order.updatedAt;
  const deadline = deliveredAt.getTime() + windowHours * 60 * 60 * 1000;
  if (appNow(env).getTime() > deadline) {
    throw new AppError('VALIDATION_ERROR', 'Claim window expired', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.claim.create({
      data: { orderId, reason, images, status: 'OPEN' },
    });
    await transitionOrderStatus(tx, {
      orderId,
      from: 'DELIVERED',
      to: 'DISPUTED',
      actorId: user.id,
      note: 'Buyer opened claim',
    });
  });
}

export async function resolveClaim(
  adminId: string,
  orderId: string,
  decision: 'APPROVE' | 'REJECT',
  note: string,
) {
  await prisma.$transaction(async (tx) => {
    const claim = await tx.claim.findUnique({ where: { orderId } });
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!claim || !order) throw new AppError('NOT_FOUND', 'Claim not found', 404);
    if (order.status !== 'DISPUTED') {
      throw new AppError('INVALID_TRANSITION', 'Order is not disputed', 409);
    }

    if (decision === 'APPROVE') {
      await createRefundLedgerForOrder(tx, orderId);
      await tx.claim.update({
        where: { orderId },
        data: { status: 'REFUNDED', resolution: note },
      });
      await transitionOrderStatus(tx, {
        orderId,
        from: 'DISPUTED',
        to: 'REFUNDED',
        actorId: adminId,
        note,
      });
    } else {
      await tx.claim.update({
        where: { orderId },
        data: { status: 'REJECTED', resolution: note },
      });
      await transitionOrderStatus(tx, {
        orderId,
        from: 'DISPUTED',
        to: 'DELIVERED',
        actorId: adminId,
        note,
      });
    }
  });
}
