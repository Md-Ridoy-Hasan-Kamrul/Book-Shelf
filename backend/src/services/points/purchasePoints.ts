import type { Prisma } from '@prisma/client';
import { awardPoints } from './awardPoints.js';
import { pointsForDeliveredOrder } from './pointRules.js';
import { prisma } from '../../lib/prisma.js';

/** Award points on DELIVERED only (never on order create). Idempotent per order. */
export async function awardPointsForDeliveredOrder(orderId: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  const order = await client.order.findUnique({
    where: { id: orderId },
    select: { id: true, buyerId: true, total: true, status: true },
  });
  if (!order || order.status !== 'DELIVERED') return { awarded: false };

  const totalBdt = Number(order.total.toFixed(2));
  const delta = await pointsForDeliveredOrder(totalBdt);
  if (delta <= 0) return { awarded: false };

  return awardPoints(order.buyerId, 'PURCHASE_DELIVERED', order.id, delta, {
    tx,
    note: `Delivered order ${order.id}`,
  });
}
