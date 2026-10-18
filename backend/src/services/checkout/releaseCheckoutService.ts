import { prisma } from '../../lib/prisma.js';
import { releaseListingReservation } from './stockReservationService.js';
import { transitionOrderStatus } from '../order/orderStateMachine.js';

export async function releaseExpiredCheckout(checkoutId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const checkout = await tx.checkout.findUnique({
      where: { id: checkoutId },
      include: {
        orders: {
          include: { lineItems: true },
        },
      },
    });
    if (!checkout || checkout.status !== 'PENDING') {
      return false;
    }
    if (checkout.expiresAt && checkout.expiresAt > new Date()) {
      return false;
    }

    for (const order of checkout.orders) {
      if (order.status !== 'PENDING_PAYMENT') {
        continue;
      }
      for (const line of order.lineItems) {
        if (line.listingId) {
          await releaseListingReservation(tx, line.listingId, line.qty);
        }
      }
      await transitionOrderStatus(tx, {
        orderId: order.id,
        from: 'PENDING_PAYMENT',
        to: 'CANCELLED',
        note: 'Checkout reservation expired',
      });
    }

    await tx.checkout.update({
      where: { id: checkoutId },
      data: { status: 'EXPIRED' },
    });
    return true;
  });
}
