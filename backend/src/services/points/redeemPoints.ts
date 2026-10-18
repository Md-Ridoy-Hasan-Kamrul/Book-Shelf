import type { Prisma } from '@prisma/client';
import { AppError } from '../../lib/appError.js';
import { awardPoints } from './awardPoints.js';
import { pointsPerBdt, pointsToBdtPaisa, redemptionCapBps } from './pointRules.js';
import { getSystemSetting } from '../settings/systemSettingsService.js';

/**
 * Redeem points against an order/checkout. Writes REDEEM PointLedger via awardPoints only.
 * Returns discount in paisa and points spent.
 */
export async function redeemPointsForCheckout(
  tx: Prisma.TransactionClient,
  userId: string,
  checkoutId: string,
  pointsRequested: number,
  orderTotalPaisa: bigint,
): Promise<{ pointsSpent: number; discountPaisa: bigint }> {
  if (!Number.isInteger(pointsRequested) || pointsRequested <= 0) {
    return { pointsSpent: 0, discountPaisa: 0n };
  }

  const ptsPerBdt = await pointsPerBdt();
  const capBps = await redemptionCapBps();
  const maxDiscountPaisa = (orderTotalPaisa * BigInt(capBps)) / 10_000n;
  const requestedDiscount = pointsToBdtPaisa(pointsRequested, ptsPerBdt);
  const discountPaisa = requestedDiscount > maxDiscountPaisa ? maxDiscountPaisa : requestedDiscount;
  const pointsSpent = Number((discountPaisa * BigInt(ptsPerBdt)) / 100n);

  if (pointsSpent <= 0) {
    return { pointsSpent: 0, discountPaisa: 0n };
  }

  // Margin guard: discount must leave min margin on order
  const minMarginBps = await getSystemSetting<number>('margin_guard_min_bps', 500);
  const after = orderTotalPaisa - discountPaisa;
  if (after * 10_000n < orderTotalPaisa * BigInt(minMarginBps)) {
    throw new AppError('VALIDATION_ERROR', 'Point redemption blocked by margin guard', 400);
  }

  await awardPoints(userId, 'REDEEM', checkoutId, -pointsSpent, {
    tx,
    kind: 'REDEEM',
    note: `Redeem ${pointsSpent} pts on checkout ${checkoutId}`,
  });

  return { pointsSpent, discountPaisa };
}
