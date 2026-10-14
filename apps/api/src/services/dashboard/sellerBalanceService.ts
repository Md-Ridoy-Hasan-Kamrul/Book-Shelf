import { fromPaisa, toPaisa } from '@bookverse/shared';
import { prisma } from '../../lib/prisma.js';

/** Seller SALE balance — excludes entries already tied to a payout batch. */
export async function sumSellerSaleBalance(
  sellerId: string,
  status: 'PENDING' | 'AVAILABLE',
): Promise<string> {
  const rows = await prisma.ledgerEntry.findMany({
    where: {
      ownerId: sellerId,
      kind: 'SALE',
      status,
      payoutId: null,
    },
    select: { amount: true },
  });
  const sum = rows.reduce((s, r) => s + toPaisa(r.amount.toString()), 0n);
  return fromPaisa(sum);
}
