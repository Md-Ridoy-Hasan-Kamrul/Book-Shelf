import { toPaisa } from '@bookverse/shared';
import type { ApiEnv } from '@bookverse/shared';
import type { Prisma } from '@prisma/client';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import type { PaymentProvider } from '../../providers/payment/types.js';
import { createSaleLedgerForOrder } from './ledgerService.js';
import { transitionOrderStatus } from '../order/orderStateMachine.js';

export async function processPaymentIpn(
  env: ApiEnv,
  provider: PaymentProvider,
  rawBody: Record<string, string>,
): Promise<{ processed: boolean; reason?: string }> {
  const validated = await provider.validateIpn(rawBody);
  if (!validated.ok) {
    return { processed: false, reason: validated.reason ?? `Payment status ${validated.status}` };
  }

  const dup = await prisma.paymentEvent.findUnique({
    where: { provider_eventId: { provider: provider.kind, eventId: validated.eventId } },
  });
  if (dup) {
    return { processed: false, reason: 'Duplicate IPN' };
  }

  const intent = await prisma.paymentIntent.findUnique({
    where: { tranId: validated.tranId },
    include: { checkout: { include: { orders: true } } },
  });
  if (!intent) {
    throw new AppError('NOT_FOUND', 'Payment intent not found', 404);
  }

  const expectedPaisa = toPaisa(intent.amount.toString());
  const gotPaisa = toPaisa(validated.amount);
  if (gotPaisa !== expectedPaisa) {
    throw new AppError('VALIDATION_ERROR', 'IPN amount mismatch', 400);
  }
  if (validated.currency !== intent.currency) {
    throw new AppError('VALIDATION_ERROR', 'IPN currency mismatch', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentEvent.create({
      data: {
        provider: provider.kind,
        eventId: validated.eventId,
        payload: rawBody as Prisma.InputJsonValue,
        orderId: intent.checkout.orders[0]?.id,
      },
    });
    await tx.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'COMPLETED' },
    });
    await tx.checkout.update({
      where: { id: intent.checkoutId },
      data: { status: 'COMPLETED' },
    });

    for (const order of intent.checkout.orders) {
      if (order.status !== 'PENDING_PAYMENT') continue;
      await transitionOrderStatus(tx, {
        orderId: order.id,
        from: 'PENDING_PAYMENT',
        to: 'PAID',
        note: 'Online payment confirmed via IPN',
      });
      await transitionOrderStatus(tx, {
        orderId: order.id,
        from: 'PAID',
        to: 'PROCESSING',
        note: 'Order processing',
      });
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'CAPTURED' },
      });
      await createSaleLedgerForOrder(tx, order.id);
    }
  });

  return { processed: true };
}
