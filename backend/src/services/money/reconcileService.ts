import { toPaisa } from '@bookverse/shared';
import { prisma } from '../../lib/prisma.js';

export type ReconcileIssue = {
  orderId: string;
  expectedPaisa: string;
  ledgerPaisa: string;
  message: string;
};

export async function reconcileOrdersVsLedger(): Promise<{
  ok: boolean;
  issues: ReconcileIssue[];
}> {
  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: 'CAPTURED',
      status: { notIn: ['CANCELLED'] },
    },
    include: { lineItems: true, ledgerEntries: true },
  });

  const issues: ReconcileIssue[] = [];
  for (const order of orders) {
    const expected = order.lineItems.reduce(
      (s, li) => s + toPaisa(li.sellerAmount.toString()) + toPaisa(li.commissionAmount.toString()),
      0n,
    );
    const ledger = order.ledgerEntries
      .filter((e) => e.kind === 'SALE' || e.kind === 'COMMISSION')
      .filter((e) => e.status !== 'VOID')
      .reduce((s, e) => s + toPaisa(e.amount.toString()), 0n);

    if (expected !== ledger) {
      issues.push({
        orderId: order.id,
        expectedPaisa: expected.toString(),
        ledgerPaisa: ledger.toString(),
        message: 'Line seller+commission sum does not match ledger SALE+COMMISSION',
      });
    }
  }

  return { ok: issues.length === 0, issues };
}
