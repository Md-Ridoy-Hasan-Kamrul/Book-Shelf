import { fromPaisa, toPaisa } from '@bookverse/shared';
import { prisma } from '../../lib/prisma.js';
import { getSystemSetting } from '../settings/systemSettingsService.js';

export async function runWeeklyPayoutBatch(
  referencePrefix = 'PAYOUT',
): Promise<{ payouts: number }> {
  const minBdt = await getSystemSetting<string>('min_payout_amount', '500.00');
  const minPaisa = toPaisa(minBdt);

  const rows = await prisma.ledgerEntry.groupBy({
    by: ['ownerId'],
    where: {
      status: 'AVAILABLE',
      payoutId: null,
      kind: { in: ['SALE', 'COMMISSION', 'PAYMENT_FEE', 'REFUND'] },
    },
    _sum: { amount: true },
  });

  let created = 0;
  for (const row of rows) {
    const sumPaisa = toPaisa(row._sum.amount?.toString() ?? '0');
    if (sumPaisa < minPaisa) continue;

    await prisma.$transaction(async (tx) => {
      const entries = await tx.ledgerEntry.findMany({
        where: { ownerId: row.ownerId, status: 'AVAILABLE', payoutId: null },
      });
      const total = entries.reduce((s, e) => s + toPaisa(e.amount.toString()), 0n);
      if (total < minPaisa) return;

      const payout = await tx.payout.create({
        data: {
          ownerId: row.ownerId,
          amount: fromPaisa(total),
          status: 'PENDING',
          reference: `${referencePrefix}-${Date.now()}`,
        },
      });

      for (const e of entries) {
        await tx.ledgerEntry.update({
          where: { id: e.id },
          data: { payoutId: payout.id },
        });
      }

      created += 1;
    });
  }

  return { payouts: created };
}
