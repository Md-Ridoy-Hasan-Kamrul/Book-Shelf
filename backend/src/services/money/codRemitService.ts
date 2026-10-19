import type { ApiEnv } from '@bookverse/shared';
import type { Prisma } from '@prisma/client';
import { AppError } from '../../lib/appError.js';
import { appNow } from '../../lib/clock.js';
import { prisma } from '../../lib/prisma.js';
import { getSystemSetting } from '../settings/systemSettingsService.js';
import { createSaleLedgerForOrder } from './ledgerService.js';
import { codEscrowStart, escrowAvailableAt } from './escrowTiming.js';

/**
 * Courier remitted COD cash — write SALE + commission ledger; set availableAt
 * = max(deliveredAt, codRemittedAt) + escrow_days (Appendix C).
 */
export async function confirmCodRemit(orderId: string, env: ApiEnv): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
    if (order.paymentMethod !== 'COD') {
      throw new AppError('VALIDATION_ERROR', 'Not a COD order', 400);
    }
    if (order.paymentStatus === 'CAPTURED') return;

    const remittedAt = appNow(env);
    await tx.shipment.updateMany({
      where: { orderId },
      data: { codRemittedAt: remittedAt },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'CAPTURED' },
    });
    await createSaleLedgerForOrder(tx, orderId);

    const escrowDays = await getSystemSetting<number>('escrow_days', 7);
    const availableAt = escrowAvailableAt(
      codEscrowStart(order.deliveredAt, remittedAt),
      escrowDays,
    );
    await tx.ledgerEntry.updateMany({
      where: {
        orderId,
        status: 'PENDING',
        kind: { in: ['SALE', 'COMMISSION', 'PAYMENT_FEE'] },
      },
      data: { availableAt },
    });
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

  // Who pays RTO: config `rto_cost_payer` = platform | seller (default platform)
  const payer = await getSystemSetting<string>('rto_cost_payer', 'platform');
  const ownerId =
    payer === 'seller'
      ? ((
          await tx.orderLineItem.findFirst({
            where: { orderId },
            select: { sellerId: true },
          })
        )?.sellerId ?? platformOwnerId)
      : platformOwnerId;

  await tx.ledgerEntry.create({
    data: {
      ownerId,
      ownerType: payer === 'seller' ? 'USER' : 'PLATFORM',
      orderId,
      amount: costBdt,
      kind: 'RTO_COST',
      status: 'AVAILABLE',
      idempotencyKey: `rto:${orderId}`,
    },
  });
}
