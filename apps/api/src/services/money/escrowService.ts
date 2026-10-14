import type { ApiEnv } from '@bookverse/shared';
import type { Prisma } from '@prisma/client';
import { appNow } from '../../lib/clock.js';
import { prisma } from '../../lib/prisma.js';
import { getSystemSetting } from '../settings/systemSettingsService.js';

export async function onOrderDelivered(
  tx: Prisma.TransactionClient,
  orderId: string,
  env: ApiEnv,
): Promise<void> {
  const deliveredAt = appNow(env);
  await tx.order.update({
    where: { id: orderId },
    data: { deliveredAt },
  });
  const escrowDays = await getSystemSetting<number>('escrow_days', 7);
  const availableAt = new Date(deliveredAt.getTime() + escrowDays * 24 * 60 * 60 * 1000);
  await tx.ledgerEntry.updateMany({
    where: {
      orderId,
      status: 'PENDING',
      kind: { in: ['SALE', 'COMMISSION', 'PAYMENT_FEE'] },
    },
    data: { availableAt },
  });
}

function hasOpenClaim(order: { claim: { status: string } | null }): boolean {
  if (!order.claim) return false;
  return order.claim.status === 'OPEN' || order.claim.status === 'UNDER_REVIEW';
}

/** Only mutates status / availableAt on existing entries (Appendix C). */
export async function releaseDueEscrowEntries(env: ApiEnv): Promise<number> {
  const now = appNow(env);
  const pending = await prisma.ledgerEntry.findMany({
    where: {
      status: 'PENDING',
      availableAt: { lte: now },
      kind: { in: ['SALE', 'COMMISSION', 'PAYMENT_FEE'] },
    },
    include: { order: { include: { claim: true } } },
    take: 500,
  });

  let released = 0;
  for (const entry of pending) {
    if (entry.order?.status === 'DISPUTED' || hasOpenClaim(entry.order ?? { claim: null })) {
      continue;
    }
    const updated = await prisma.ledgerEntry.updateMany({
      where: { id: entry.id, status: 'PENDING' },
      data: { status: 'AVAILABLE' },
    });
    released += updated.count;
  }
  return released;
}
