import type { OrderStatus } from '@prisma/client';
import { fromPaisa, toPaisa } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { cursorWhere, encodeCursor } from '../../lib/cursorPagination.js';
import { prisma } from '../../lib/prisma.js';
import { sumSellerSaleBalance } from './sellerBalanceService.js';

const TO_PACK: OrderStatus[] = ['PROCESSING', 'PACKED'];

export async function getSellerOverview(sellerId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [
    ordersTotal,
    ordersToPack,
    salesOrders,
    openClaims,
    balancePendingBdt,
    balanceAvailableBdt,
  ] = await Promise.all([
    prisma.order.count({ where: { sellerId } }),
    prisma.order.count({ where: { sellerId, status: { in: TO_PACK } } }),
    prisma.order.findMany({
      where: {
        sellerId,
        createdAt: { gte: since },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      select: { total: true },
    }),
    prisma.claim.count({
      where: {
        order: { sellerId },
        status: { in: ['OPEN', 'UNDER_REVIEW'] },
      },
    }),
    sumSellerSaleBalance(sellerId, 'PENDING'),
    sumSellerSaleBalance(sellerId, 'AVAILABLE'),
  ]);

  const salesPaisa = salesOrders.reduce((s, o) => s + toPaisa(o.total.toString()), 0n);

  return {
    ordersTotal,
    ordersToPack,
    salesLast30DaysBdt: fromPaisa(salesPaisa),
    balancePendingBdt,
    balanceAvailableBdt,
    openClaims,
  };
}

export async function listSellerListings(sellerId: string, cursor?: string, limit = 20) {
  const take = limit + 1;
  const rows = await prisma.listing.findMany({
    where: { sellerId, ...(cursorWhere(cursor) ?? {}) },
    include: { book: { select: { title: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((l) => ({
      id: l.id,
      bookTitle: l.book.title,
      price: l.price.toString(),
      stock: l.stock,
      reservedQty: l.reservedQty,
      status: l.status,
      updatedAt: l.updatedAt.toISOString(),
    })),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

export async function listSellerOrders(
  sellerId: string,
  filter: 'all' | 'to_pack' | 'shipped',
  cursor?: string,
  limit = 20,
) {
  const statusFilter =
    filter === 'to_pack'
      ? { in: TO_PACK }
      : filter === 'shipped'
        ? { in: ['SHIPPED', 'DELIVERED'] as OrderStatus[] }
        : undefined;

  const take = limit + 1;
  const rows = await prisma.order.findMany({
    where: {
      sellerId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(cursorWhere(cursor) ?? {}),
    },
    include: {
      buyer: { select: { name: true, displayName: true } },
      shipment: { select: { trackingCode: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((o) => ({
      id: o.id,
      status: o.status,
      total: o.total.toString(),
      paymentMethod: o.paymentMethod,
      buyerName: o.buyer.displayName ?? o.buyer.name,
      trackingCode: o.shipment?.trackingCode ?? null,
      createdAt: o.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

export async function getSellerOrder(sellerId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, sellerId },
    include: {
      lineItems: true,
      shipment: true,
      buyer: { select: { name: true } },
    },
  });
  if (!order) {
    throw new AppError('NOT_FOUND', 'Order not found', 404);
  }
  return order;
}

export async function listSellerEarnings(sellerId: string, cursor?: string, limit = 20) {
  const take = limit + 1;
  const rows = await prisma.order.findMany({
    where: {
      sellerId,
      status: { notIn: ['CANCELLED', 'PENDING_PAYMENT'] },
      ...(cursorWhere(cursor) ?? {}),
    },
    include: { lineItems: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((o) => ({
      orderId: o.id,
      orderTotal: o.total.toString(),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      lines: o.lineItems.map((li) => ({
        title: li.titleSnap,
        lineTotal: li.lineTotal.toString(),
        commissionBps: li.commissionBps,
        commissionAmount: li.commissionAmount.toString(),
        sellerAmount: li.sellerAmount.toString(),
      })),
    })),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

export async function listSellerPayouts(sellerId: string, cursor?: string, limit = 20) {
  const take = limit + 1;
  const rows = await prisma.payout.findMany({
    where: { ownerId: sellerId, ...(cursorWhere(cursor) ?? {}) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((p) => ({
      id: p.id,
      amount: p.amount.toString(),
      status: p.status,
      reference: p.reference,
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

export async function listSellerClaims(sellerId: string, cursor?: string, limit = 20) {
  const take = limit + 1;
  const rows = await prisma.claim.findMany({
    where: { order: { sellerId }, ...(cursorWhere(cursor) ?? {}) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((c) => ({
      orderId: c.orderId,
      status: c.status,
      reason: c.reason,
      createdAt: c.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}
