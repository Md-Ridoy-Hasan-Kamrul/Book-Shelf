import type { OrderStatus, Prisma } from '@prisma/client';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';

export async function assertOrderTransitionAllowed(
  from: OrderStatus,
  to: OrderStatus,
): Promise<void> {
  const row = await prisma.orderStatusTransition.findUnique({
    where: { fromStatus_toStatus: { fromStatus: from, toStatus: to } },
  });
  if (!row) {
    throw new AppError('INVALID_TRANSITION', `Cannot move order from ${from} to ${to}`, 409);
  }
}

export async function transitionOrderStatus(
  tx: Prisma.TransactionClient,
  params: {
    orderId: string;
    from: OrderStatus;
    to: OrderStatus;
    actorId?: string;
    note?: string;
  },
): Promise<void> {
  await assertOrderTransitionAllowed(params.from, params.to);
  const updated = await tx.order.updateMany({
    where: { id: params.orderId, status: params.from },
    data: { status: params.to },
  });
  if (updated.count !== 1) {
    throw new AppError('CONFLICT', 'Order status changed concurrently', 409);
  }
  await tx.orderStatusHistory.create({
    data: {
      orderId: params.orderId,
      status: params.to,
      actorId: params.actorId,
      note: params.note,
    },
  });
}

export function canCancelBeforeShip(status: OrderStatus): boolean {
  return (
    status === 'PENDING_PAYMENT' ||
    status === 'PAID' ||
    status === 'PROCESSING' ||
    status === 'PACKED'
  );
}
