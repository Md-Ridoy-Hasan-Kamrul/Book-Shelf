import type { OrderStatus } from '@prisma/client';
import type { ApiEnv, MeUser } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { releaseListingReservation } from '../checkout/stockReservationService.js';
import { canCancelBeforeShip, transitionOrderStatus } from './orderStateMachine.js';

export async function listOrdersForBuyer(userId: string, cursor?: string, limit = 20) {
  const cursorParts = cursor?.split('|');
  const take = limit + 1;
  const orders = await prisma.order.findMany({
    where: {
      buyerId: userId,
      ...(cursorParts?.[0] && cursorParts[1]
        ? {
            OR: [
              { createdAt: { lt: new Date(cursorParts[0]) } },
              { createdAt: new Date(cursorParts[0]), id: { lt: cursorParts[1] } },
            ],
          }
        : {}),
    },
    include: { seller: { select: { displayName: true, name: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });

  const page = orders.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((o) => ({
      id: o.id,
      sellerId: o.sellerId,
      sellerName: o.seller.displayName ?? o.seller.name,
      status: o.status,
      paymentMethod: o.paymentMethod,
      total: o.total.toString(),
      createdAt: o.createdAt.toISOString(),
    })),
    nextCursor: orders.length > limit && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
  };
}

export async function getOrderForBuyer(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId: userId },
    include: {
      seller: { select: { displayName: true, name: true } },
      lineItems: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!order) {
    throw new AppError('NOT_FOUND', 'Order not found', 404);
  }
  return {
    id: order.id,
    checkoutId: order.checkoutId,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal.toString(),
    shippingFee: order.shippingFee.toString(),
    discount: order.discount.toString(),
    total: order.total.toString(),
    sellerName: order.seller.displayName ?? order.seller.name,
    lineItems: order.lineItems.map((li) => ({
      title: li.titleSnap,
      unitPrice: li.unitPrice.toString(),
      qty: li.qty,
      lineTotal: li.lineTotal.toString(),
      commissionBps: li.commissionBps,
      sellerAmount: li.sellerAmount.toString(),
    })),
    statusHistory: order.statusHistory.map((h) => ({
      status: h.status,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    })),
    createdAt: order.createdAt.toISOString(),
  };
}

export async function cancelOrderByBuyer(user: MeUser, orderId: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, buyerId: user.id },
      include: { lineItems: true },
    });
    if (!order) {
      throw new AppError('NOT_FOUND', 'Order not found', 404);
    }
    if (!canCancelBeforeShip(order.status)) {
      throw new AppError('INVALID_TRANSITION', 'Order cannot be cancelled at this stage', 409);
    }
    const from = order.status;
    for (const line of order.lineItems) {
      if (line.listingId) {
        await releaseListingReservation(tx, line.listingId, line.qty);
      }
    }
    await transitionOrderStatus(tx, {
      orderId: order.id,
      from,
      to: 'CANCELLED',
      actorId: user.id,
      note: 'Cancelled by buyer',
    });
  });
}

export async function adminTransitionOrder(
  env: ApiEnv,
  adminId: string,
  orderId: string,
  to: OrderStatus,
  note?: string,
) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new AppError('NOT_FOUND', 'Order not found', 404);
    }
    await transitionOrderStatus(tx, {
      orderId,
      from: order.status,
      to,
      actorId: adminId,
      note,
    });
    if (to === 'DELIVERED') {
      const { onOrderDelivered } = await import('../money/escrowService.js');
      await onOrderDelivered(tx, orderId, env);
    }
  });
}
