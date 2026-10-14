import { fromPaisa, toPaisa } from '@bookverse/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { getSystemSetting } from '../settings/systemSettingsService.js';

export async function getPlatformOwnerId(): Promise<string> {
  const id = await getSystemSetting<string | null>('platform_ledger_user_id', null);
  if (id) return id;
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  if (!admin) throw new Error('No platform ledger owner configured');
  return admin.id;
}

function paymentFeeForLine(
  lineTotalPaisa: bigint,
  orderTotalPaisa: bigint,
  orderFeePaisa: bigint,
): bigint {
  if (orderTotalPaisa <= 0n) return 0n;
  return (orderFeePaisa * lineTotalPaisa) / orderTotalPaisa;
}

/** Appendix C — immutable ledger rows on payment / COD remit. */
export async function createSaleLedgerForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<void> {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { lineItems: true },
  });
  if (order.paymentMethod === 'COD' && order.paymentStatus !== 'CAPTURED') {
    return;
  }

  const existing = await tx.ledgerEntry.findFirst({
    where: { orderId, kind: 'SALE' },
  });
  if (existing) return;

  const platformOwnerId = await getPlatformOwnerId();
  const feeBps = await getSystemSetting<number>('payment_fee_bps', 150);
  const orderTotalPaisa = toPaisa(order.total.toString());
  const orderFeePaisa = (orderTotalPaisa * BigInt(feeBps) + 5000n) / 10000n;

  for (const line of order.lineItems) {
    const linePaisa = toPaisa(line.sellerAmount.toString());
    const commPaisa = toPaisa(line.commissionAmount.toString());
    const feePaisa = paymentFeeForLine(
      toPaisa(line.lineTotal.toString()),
      orderTotalPaisa,
      orderFeePaisa,
    );

    await tx.ledgerEntry.create({
      data: {
        ownerId: line.sellerId,
        ownerType: 'USER',
        orderId,
        orderLineItemId: line.id,
        amount: fromPaisa(linePaisa),
        kind: 'SALE',
        status: 'PENDING',
        idempotencyKey: `sale:${line.id}`,
      },
    });
    await tx.ledgerEntry.create({
      data: {
        ownerId: platformOwnerId,
        ownerType: 'PLATFORM',
        orderId,
        orderLineItemId: line.id,
        amount: fromPaisa(commPaisa),
        kind: 'COMMISSION',
        status: 'PENDING',
        idempotencyKey: `commission:${line.id}`,
      },
    });
    if (feePaisa > 0n) {
      await tx.ledgerEntry.create({
        data: {
          ownerId: platformOwnerId,
          ownerType: 'PLATFORM',
          orderId,
          orderLineItemId: line.id,
          amount: fromPaisa(feePaisa),
          kind: 'PAYMENT_FEE',
          status: 'PENDING',
          idempotencyKey: `payment_fee:${line.id}`,
        },
      });
    }
  }
}

export async function createRefundLedgerForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<void> {
  const entries = await tx.ledgerEntry.findMany({
    where: {
      orderId,
      kind: { in: ['SALE', 'COMMISSION', 'PAYMENT_FEE'] },
      status: { not: 'VOID' },
    },
  });
  for (const e of entries) {
    const neg = toPaisa(e.amount.toString()) * -1n;
    await tx.ledgerEntry.create({
      data: {
        ownerId: e.ownerId,
        ownerType: e.ownerType,
        orderId,
        orderLineItemId: e.orderLineItemId,
        amount: fromPaisa(neg),
        kind: 'REFUND',
        status: 'AVAILABLE',
        idempotencyKey: `refund:${e.id}`,
      },
    });
  }
}
