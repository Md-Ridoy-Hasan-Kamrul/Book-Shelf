import { toPaisa, fromPaisa } from '@bookverse/shared';
import { prisma } from '../../lib/prisma.js';

export async function computeShippingFeePaisa(
  district: string,
  itemCount: number,
  weightKg: number,
): Promise<bigint> {
  const rule =
    (await prisma.deliveryFeeRule.findFirst({ where: { district, active: true } })) ??
    (await prisma.deliveryFeeRule.findFirst({ where: { district: 'Default', active: true } }));
  if (!rule) {
    return toPaisa('120.00');
  }
  const base = toPaisa(rule.baseFee.toString());
  const perItem = toPaisa(rule.perItemFee.toString()) * BigInt(Math.max(0, itemCount - 1));
  const perKg = toPaisa(rule.perKgFee.toString()) * BigInt(Math.ceil(weightKg));
  return base + perItem + perKg;
}

export function shippingFeeDisplay(paisa: bigint): string {
  return fromPaisa(paisa);
}
