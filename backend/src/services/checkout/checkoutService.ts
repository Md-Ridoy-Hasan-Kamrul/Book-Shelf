import { fromPaisa, splitCommission, toPaisa } from '@bookverse/shared';
import type { PaymentMethod } from '@prisma/client';
import type { MeUser } from '@bookverse/shared';
import type { z } from 'zod';
import type { checkoutBodySchema } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { assertCodAllowed } from './codGuardService.js';
import { buildCheckoutQuote } from './checkoutQuoteService.js';
import { reserveListingStock } from './stockReservationService.js';
import { transitionOrderStatus } from '../order/orderStateMachine.js';
import { getSystemSetting } from '../settings/systemSettingsService.js';
import type { ApiEnv } from '@bookverse/shared';

type CheckoutBody = z.infer<typeof checkoutBodySchema>;

function allocateDiscount(groupSubtotal: bigint, totalSubtotal: bigint, discount: bigint): bigint {
  if (discount <= 0n || totalSubtotal <= 0n) return 0n;
  return (discount * groupSubtotal) / totalSubtotal;
}

export async function performCheckout(
  env: ApiEnv,
  user: MeUser,
  idempotencyKey: string,
  body: CheckoutBody,
) {
  const existing = await prisma.checkout.findUnique({
    where: { idempotencyKey },
    include: {
      orders: {
        include: { seller: { select: { displayName: true, name: true } } },
      },
    },
  });
  if (existing) {
    return formatCheckoutResult(existing);
  }

  if (!body.addressId) {
    throw new AppError('VALIDATION_ERROR', 'Shipping address is required', 400);
  }
  const address = await prisma.address.findFirst({
    where: { id: body.addressId, userId: user.id },
  });
  if (!address) {
    throw new AppError('NOT_FOUND', 'Address not found', 404);
  }

  const built = await buildCheckoutQuote(body);
  if (built.quote.issues.length > 0) {
    throw new AppError('VALIDATION_ERROR', built.quote.issues.join('; '), 400, built.quote.issues);
  }

  if (body.paymentMethod === 'COD') {
    const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    await assertCodAllowed(dbUser, built.quote.total);
  }

  const reservationMinutes = await getSystemSetting<number>('checkout_reservation_minutes', 15);
  const expiresAt =
    body.paymentMethod === 'ONLINE' ? new Date(Date.now() + reservationMinutes * 60 * 1000) : null;

  const sellerGroups = new Map<string, typeof built.lines>();
  for (const line of built.lines) {
    const arr = sellerGroups.get(line.sellerId) ?? [];
    arr.push(line);
    sellerGroups.set(line.sellerId, arr);
  }
  const shippingBySeller = new Map(
    built.quote.sellerGroups.map((g) => [g.sellerId, toPaisa(g.shippingFee)]),
  );

  const checkout = await prisma.$transaction(async (tx) => {
    const createdCheckout = await tx.checkout.create({
      data: {
        buyerId: user.id,
        paymentMethod: body.paymentMethod as PaymentMethod,
        status: body.paymentMethod === 'COD' ? 'COMPLETED' : 'PENDING',
        couponCode: body.couponCode?.toUpperCase(),
        shippingAddressId: address.id,
        idempotencyKey,
        expiresAt,
      },
    });

    let pointsDiscountPaisa = 0n;
    if (body.pointsToRedeem && body.pointsToRedeem > 0) {
      const quoteTotalPaisa =
        built.subtotalPaisa +
        [...shippingBySeller.values()].reduce((a, b) => a + b, 0n) -
        built.discountTotalPaisa;
      const { redeemPointsForCheckout } = await import('../points/redeemPoints.js');
      const redeemed = await redeemPointsForCheckout(
        tx,
        user.id,
        createdCheckout.id,
        body.pointsToRedeem,
        quoteTotalPaisa,
      );
      pointsDiscountPaisa = redeemed.discountPaisa;
    }

    const orders = [];
    for (const [sellerId, groupLines] of sellerGroups) {
      const groupSubtotal = groupLines.reduce((s, l) => s + l.lineTotalPaisa, 0n);
      const groupDiscount = allocateDiscount(
        groupSubtotal,
        built.subtotalPaisa,
        built.discountTotalPaisa,
      );
      const groupPointDiscount = allocateDiscount(
        groupSubtotal,
        built.subtotalPaisa,
        pointsDiscountPaisa,
      );
      const groupShipping = shippingBySeller.get(sellerId) ?? 0n;
      const groupTotal = groupSubtotal + groupShipping - groupDiscount - groupPointDiscount;

      for (const line of groupLines) {
        await reserveListingStock(tx, line.listingId, line.qty);
      }

      const order = await tx.order.create({
        data: {
          checkoutId: createdCheckout.id,
          buyerId: user.id,
          sellerId,
          status: 'PENDING_PAYMENT',
          paymentMethod: body.paymentMethod as PaymentMethod,
          paymentStatus: body.paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
          subtotal: fromPaisa(groupSubtotal),
          shippingFee: fromPaisa(groupShipping),
          discount: fromPaisa(groupDiscount + groupPointDiscount),
          total: fromPaisa(groupTotal < 0n ? 0n : groupTotal),
          shippingAddressId: address.id,
        },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: 'PENDING_PAYMENT', note: 'Order created' },
      });

      for (const line of groupLines) {
        const { sellerPaisa, commissionPaisa } = splitCommission(
          line.lineTotalPaisa,
          line.commissionBps,
        );
        await tx.orderLineItem.create({
          data: {
            orderId: order.id,
            listingId: line.listingId,
            bookId: line.bookId,
            titleSnap: line.title,
            unitPrice: line.unitPrice,
            qty: line.qty,
            lineTotal: fromPaisa(line.lineTotalPaisa),
            sellerId: line.sellerId,
            commissionBps: line.commissionBps,
            commissionAmount: fromPaisa(commissionPaisa),
            sellerAmount: fromPaisa(sellerPaisa),
          },
        });
      }

      if (body.paymentMethod === 'COD') {
        await transitionOrderStatus(tx, {
          orderId: order.id,
          from: 'PENDING_PAYMENT',
          to: 'PROCESSING',
          actorId: user.id,
          note: 'COD confirmed at checkout',
        });
      }

      orders.push(order);
    }

    return { ...createdCheckout, orders };
  });

  if (body.paymentMethod === 'ONLINE' && checkout.expiresAt) {
    const { scheduleCheckoutRelease } = await import('../../jobs/checkoutQueue.js');
    await scheduleCheckoutRelease(env, checkout.id, checkout.expiresAt);
  }

  const full = await prisma.checkout.findUniqueOrThrow({
    where: { id: checkout.id },
    include: {
      orders: {
        include: { seller: { select: { displayName: true, name: true } } },
      },
    },
  });

  return formatCheckoutResult(full);
}

function formatCheckoutResult(checkout: {
  id: string;
  paymentMethod: PaymentMethod;
  orders: Array<{
    id: string;
    sellerId: string;
    status: string;
    paymentMethod: PaymentMethod;
    total: { toString(): string };
    createdAt: Date;
    seller: { displayName: string | null; name: string };
  }>;
}) {
  const orders = checkout.orders.map((o) => ({
    id: o.id,
    sellerId: o.sellerId,
    sellerName: o.seller.displayName ?? o.seller.name,
    status: o.status,
    paymentMethod: o.paymentMethod,
    total: o.total.toString(),
    createdAt: o.createdAt.toISOString(),
  }));
  const totalPaisa = checkout.orders.reduce((s, o) => s + toPaisa(o.total.toString()), 0n);
  return {
    checkoutId: checkout.id,
    orders,
    total: fromPaisa(totalPaisa),
    paymentMethod: checkout.paymentMethod,
  };
}
