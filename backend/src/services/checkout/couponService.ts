import { fromPaisa, toPaisa } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';

export type CouponResult = {
  code: string;
  discountPaisa: bigint;
  applied: boolean;
  message?: string;
};

export async function resolveCouponDiscount(
  code: string | undefined,
  subtotalPaisa: bigint,
): Promise<CouponResult> {
  if (!code) {
    return { code: '', discountPaisa: 0n, applied: false };
  }
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon || !coupon.active) {
    return { code, discountPaisa: 0n, applied: false, message: 'Coupon not found' };
  }
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { code, discountPaisa: 0n, applied: false, message: 'Coupon not active yet' };
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    return { code, discountPaisa: 0n, applied: false, message: 'Coupon expired' };
  }
  if (coupon.minSubtotal && subtotalPaisa < toPaisa(coupon.minSubtotal.toString())) {
    return { code, discountPaisa: 0n, applied: false, message: 'Minimum subtotal not met' };
  }

  let discountPaisa: bigint;
  if (coupon.discountType === 'PERCENT') {
    const bps = Math.round(Number(coupon.value) * 100);
    discountPaisa = (subtotalPaisa * BigInt(bps) + 5000n) / 10000n;
    if (coupon.maxDiscount) {
      const cap = toPaisa(coupon.maxDiscount.toString());
      if (discountPaisa > cap) discountPaisa = cap;
    }
  } else {
    discountPaisa = toPaisa(coupon.value.toString());
  }
  if (discountPaisa > subtotalPaisa) {
    discountPaisa = subtotalPaisa;
  }
  if (discountPaisa <= 0n) {
    throw new AppError('VALIDATION_ERROR', 'Invalid coupon value', 400);
  }
  return { code: coupon.code, discountPaisa, applied: true };
}

export function formatDiscount(paisa: bigint): string {
  return fromPaisa(paisa);
}
