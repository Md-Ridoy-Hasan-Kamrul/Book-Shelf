import type { Prisma } from '@prisma/client';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { releaseListingReservation } from '../checkout/stockReservationService.js';
import { recordOrderRto } from '../money/codRemitService.js';
import { getPlatformOwnerId } from '../money/ledgerService.js';
import { getMoneySetting } from '../settings/systemSettingsService.js';
import { transitionOrderStatus } from '../order/orderStateMachine.js';

export async function handleCourierReturn(
  orderId: string,
  _env: import('@bookverse/shared').ApiEnv,
) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { lineItems: true },
    });
    if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);

    for (const line of order.lineItems) {
      if (!line.listingId) continue;
      await releaseListingReservation(tx, line.listingId, line.qty);
      await tx.$executeRaw`
				UPDATE "Listing" SET stock = stock + ${line.qty} WHERE id = ${line.listingId}
			`;
    }

    const platformOwnerId = await getPlatformOwnerId();
    const rtoCost = await getMoneySetting('rto_cost_bdt', '80.00');
    await recordOrderRto(tx, orderId, rtoCost, platformOwnerId);

    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      await transitionOrderStatus(tx, {
        orderId,
        from: order.status,
        to: 'CANCELLED',
        note: 'Courier returned (RTO)',
      });
    }
  });
}
