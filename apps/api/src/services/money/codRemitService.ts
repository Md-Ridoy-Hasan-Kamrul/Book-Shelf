import type { Prisma } from '@prisma/client';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { createSaleLedgerForOrder } from './ledgerService.js';
import { transitionOrderStatus } from '../order/orderStateMachine.js';

/** Called when courier remit is confirmed (P8). */
export async function confirmCodRemit(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
    if (order.paymentMethod !== 'COD') {
      throw new AppError('VALIDATION_ERROR', 'Not a COD order', 400);
    }
    if (order.paymentStatus === 'CAPTURED') return;

    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'CAPTURED' },
    });
    await createSaleLedgerForOrder(tx, orderId);
  });
}

export async function recordOrderRto(
  tx: Prisma.TransactionClient,
  orderId: string,
  costBdt: string,
  platformOwnerId: string,
): Promise<void> {
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  await tx.user.update({
    where: { id: order.buyerId },
    data: { rtoCount: { increment: 1 }, trustScore: { decrement: 15 } },
  });

  await tx.ledgerEntry.create({
    data: {
      ownerId: platformOwnerId,
      ownerType: 'PLATFORM',
      orderId,
      amount: costBdt,
      kind: 'RTO_COST',
      status: 'AVAILABLE',
      idempotencyKey: `rto:${orderId}`,
    },
  });
}
