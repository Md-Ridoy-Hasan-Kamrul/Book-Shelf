import { fromPaisa, toPaisa } from '@bookverse/shared';
import type { ApiEnv } from '@bookverse/shared';
import type { MeUser } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import type { PaymentProvider } from '../../providers/payment/types.js';

export async function initiateCheckoutPayment(
  env: ApiEnv,
  provider: PaymentProvider,
  user: MeUser,
  checkoutId: string,
) {
  const checkout = await prisma.checkout.findFirst({
    where: { id: checkoutId, buyerId: user.id },
    include: { orders: true, buyer: true },
  });
  if (!checkout) {
    throw new AppError('NOT_FOUND', 'Checkout not found', 404);
  }
  if (checkout.paymentMethod !== 'ONLINE') {
    throw new AppError('VALIDATION_ERROR', 'Checkout is not online payment', 400);
  }

  const totalPaisa = checkout.orders.reduce((s, o) => s + toPaisa(o.total.toString()), 0n);
  const amount = fromPaisa(totalPaisa);
  const tranId = `BV-${checkout.id}`;

  const existing = await prisma.paymentIntent.findUnique({ where: { checkoutId } });
  if (existing?.gatewayUrl) {
    return { tranId: existing.tranId, gatewayUrl: existing.gatewayUrl };
  }

  const ipnPath =
    provider.kind === 'mock' ? '/webhooks/payment/mock' : '/webhooks/payment/sslcommerz';
  const ipnUrl = `${env.API_ORIGIN.replace(/\/$/, '')}${ipnPath}`;

  const session = await provider.initiateSession({
    tranId,
    amount,
    currency: 'BDT',
    customerName: checkout.buyer.name,
    customerEmail: checkout.buyer.email,
    customerPhone: checkout.buyer.phone ?? '01700000000',
    successUrl: `${env.WEB_ORIGIN}/orders?paid=1`,
    failUrl: `${env.WEB_ORIGIN}/checkout?failed=1`,
    cancelUrl: `${env.WEB_ORIGIN}/checkout?cancelled=1`,
    ipnUrl,
  });

  await prisma.paymentIntent.upsert({
    where: { checkoutId },
    create: {
      checkoutId,
      tranId,
      amount,
      currency: 'BDT',
      provider: provider.kind,
      status: 'PENDING',
      sessionKey: session.sessionKey,
      gatewayUrl: session.gatewayUrl,
    },
    update: {
      gatewayUrl: session.gatewayUrl,
      sessionKey: session.sessionKey,
    },
  });

  return { tranId, gatewayUrl: session.gatewayUrl };
}
