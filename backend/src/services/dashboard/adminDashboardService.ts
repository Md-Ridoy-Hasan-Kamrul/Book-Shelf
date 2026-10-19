import { fromPaisa, splitCommission, toPaisa } from '@bookverse/shared';
import type { Prisma } from '@prisma/client';
import { AppError } from '../../lib/appError.js';
import { cursorWhere, encodeCursor } from '../../lib/cursorPagination.js';
import { prisma } from '../../lib/prisma.js';
import { writeAdminAudit } from '../admin/adminAuditService.js';
import { resolveCommissionBps } from '../checkout/commissionService.js';
import {
  clearSettingsCache,
  getMoneySetting,
  getSystemSetting,
} from '../settings/systemSettingsService.js';

export async function getAdminKpis() {
  const orders = await prisma.order.findMany({
    where: { status: { notIn: ['CANCELLED', 'REFUNDED', 'PENDING_PAYMENT'] } },
    select: { total: true, status: true },
  });
  const gmvPaisa = orders.reduce((s, o) => s + toPaisa(o.total.toString()), 0n);
  const orderCount = orders.length;
  const aovPaisa = orderCount > 0 ? gmvPaisa / BigInt(orderCount) : 0n;

  const [rtoOrders, deliveredCount, claimCount, commissionSum] = await Promise.all([
    prisma.ledgerEntry.count({ where: { kind: 'RTO_COST' } }),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.claim.count(),
    prisma.ledgerEntry.aggregate({
      where: { kind: 'COMMISSION', status: { not: 'VOID' } },
      _sum: { amount: true },
    }),
  ]);

  const shippedBase = await prisma.order.count({
    where: { status: { in: ['SHIPPED', 'DELIVERED', 'CANCELLED'] } },
  });
  const rtoRate = shippedBase > 0 ? (rtoOrders / shippedBase) * 100 : 0;
  const claimRate = deliveredCount > 0 ? (claimCount / deliveredCount) * 100 : 0;
  const commPaisa = toPaisa(commissionSum._sum.amount?.toString() ?? '0');
  const takeRate = gmvPaisa > 0n ? Number((commPaisa * 10000n) / gmvPaisa) / 100 : 0;

  return {
    gmvBdt: fromPaisa(gmvPaisa),
    orderCount,
    aovBdt: fromPaisa(aovPaisa),
    rtoRatePct: rtoRate.toFixed(2),
    claimRatePct: claimRate.toFixed(2),
    takeRatePct: takeRate.toFixed(2),
  };
}

/**
 * Appendix D — warn when resolved commission < estimated gateway fee + courier + min margin.
 */
export async function listMarginWarnings(cursor?: string, limit = 20) {
  const feeBps = await getSystemSetting<number>('payment_fee_bps', 150);
  const minMarginBps = await getSystemSetting<number>('min_platform_margin_bps', 100);
  const courierBdt = await getMoneySetting('estimated_courier_cost_bdt', '60.00');
  const courierPaisa = toPaisa(courierBdt);
  const take = limit + 1;
  const rows = await prisma.listing.findMany({
    where: { status: 'ACTIVE', ...(cursorWhere(cursor) ?? {}) },
    include: {
      book: { select: { title: true, genre: { select: { slug: true } } } },
      seller: { select: { name: true, displayName: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take * 4,
  });

  const items = [];
  for (const l of rows) {
    const linePaisa = toPaisa(l.price.toString());
    const commissionBps = await resolveCommissionBps({
      sellerType: l.sellerType,
      sellerId: l.sellerId,
      genreSlug: l.book.genre.slug,
      isUsed: l.isUsed,
    });
    const { commissionPaisa, sellerPaisa } = splitCommission(linePaisa, commissionBps);
    const feePaisa = (linePaisa * BigInt(feeBps) + 5000n) / 10000n;
    const minMarginPaisa = (linePaisa * BigInt(minMarginBps) + 5000n) / 10000n;
    const floor = feePaisa + courierPaisa + minMarginPaisa;
    if (commissionPaisa >= floor) continue;
    const netMarginBps = linePaisa > 0n ? Number((sellerPaisa * 10000n) / linePaisa) : 0;
    items.push({
      listingId: l.id,
      bookTitle: l.book.title,
      sellerName: l.seller.displayName ?? l.seller.name,
      price: l.price.toString(),
      commissionBps,
      netMarginBps,
      floorBdt: fromPaisa(floor),
      commissionBdt: fromPaisa(commissionPaisa),
      createdAt: l.createdAt,
      id: l.id,
    });
    if (items.length >= take) break;
  }

  const page = items.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map(({ createdAt: _c, id: _i, ...rest }) => rest),
    nextCursor: items.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

export async function listAdminOrders(cursor?: string, limit = 20) {
  const take = limit + 1;
  const rows = await prisma.order.findMany({
    where: { ...(cursorWhere(cursor) ?? {}) },
    include: {
      seller: { select: { displayName: true, name: true } },
      buyer: { select: { name: true } },
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
      sellerName: o.seller.displayName ?? o.seller.name,
      buyerName: o.buyer.name,
      createdAt: o.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

export async function listAdminClaims(cursor?: string, limit = 20) {
  const take = limit + 1;
  const rows = await prisma.claim.findMany({
    where: { ...(cursorWhere(cursor) ?? {}) },
    include: {
      order: {
        select: {
          id: true,
          seller: { select: { displayName: true, name: true } },
          buyer: { select: { name: true } },
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((c) => ({
      id: c.id,
      orderId: c.orderId,
      status: c.status,
      reason: c.reason,
      images: c.images,
      sellerName: c.order.seller.displayName ?? c.order.seller.name,
      buyerName: c.order.buyer.name,
      createdAt: c.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

export async function listAdminPayouts(cursor?: string, limit = 20) {
  const take = limit + 1;
  const rows = await prisma.payout.findMany({
    where: { ...(cursorWhere(cursor) ?? {}) },
    include: { owner: { select: { name: true, displayName: true, email: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((p) => ({
      id: p.id,
      ownerName: p.owner.displayName ?? p.owner.name,
      ownerEmail: p.owner.email,
      amount: p.amount.toString(),
      status: p.status,
      reference: p.reference,
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

export async function listCommissionRules() {
  const rows = await prisma.commissionRule.findMany({
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    scope: r.scope,
    scopeRef: r.scopeRef,
    bps: r.bps,
    priority: r.priority,
    validFrom: r.validFrom.toISOString(),
    validTo: r.validTo?.toISOString() ?? null,
    active: r.active,
  }));
}

export async function updateCommissionRule(
  adminId: string,
  ruleId: string,
  patch: {
    bps?: number;
    active?: boolean;
    priority?: number;
    name?: string;
    validTo?: string | null;
  },
) {
  const before = await prisma.commissionRule.findUnique({ where: { id: ruleId } });
  if (!before) throw new AppError('NOT_FOUND', 'Rule not found', 404);
  const after = await prisma.commissionRule.update({
    where: { id: ruleId },
    data: {
      ...(patch.bps !== undefined ? { bps: patch.bps } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.validTo !== undefined
        ? { validTo: patch.validTo === null ? null : new Date(patch.validTo) }
        : {}),
    },
  });
  await writeAdminAudit(adminId, 'UPDATE', 'CommissionRule', ruleId, before, after);
  return after;
}

export async function listSystemSettings() {
  const rows = await prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  return rows.map((r) => ({ key: r.key, value: r.value, updatedAt: r.updatedAt.toISOString() }));
}

export async function updateSystemSetting(adminId: string, key: string, value: unknown) {
  const before = await prisma.systemSetting.findUnique({ where: { key } });
  const after = await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue, updatedBy: adminId },
    update: { value: value as Prisma.InputJsonValue, updatedBy: adminId },
  });
  clearSettingsCache();
  await writeAdminAudit(adminId, 'UPDATE', 'SystemSetting', key, before ?? null, after);
  return { key: after.key, value: after.value };
}

export async function listRoleApplicationsAdmin(
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL',
  cursor?: string,
  limit = 20,
) {
  const take = limit + 1;
  const rows = await prisma.roleApplication.findMany({
    where: {
      ...(status !== 'ALL' ? { status } : {}),
      ...(cursorWhere(cursor) ?? {}),
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((a) => ({
      id: a.id,
      type: a.type,
      status: a.status,
      note: a.note,
      documents: a.documents,
      userId: a.userId,
      userName: a.user.name,
      userEmail: a.user.email,
      userRole: a.user.role,
      createdAt: a.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

export async function setSellerVerified(adminId: string, userId: string, verified: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

  let before: unknown = null;
  let after: unknown = null;

  if (user.role === 'PUBLISHER') {
    const profile = await prisma.publisherProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('NOT_FOUND', 'Publisher profile not found', 404);
    before = profile;
    after = await prisma.publisherProfile.update({
      where: { userId },
      data: { verified },
    });
  } else if (user.role === 'WRITER') {
    const profile = await prisma.writerProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('NOT_FOUND', 'Writer profile not found', 404);
    before = profile;
    after = await prisma.writerProfile.update({
      where: { userId },
      data: { verified },
    });
  } else if (user.role === 'VENDOR') {
    const profile = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('NOT_FOUND', 'Vendor profile not found', 404);
    before = profile;
    after = await prisma.vendorProfile.update({
      where: { userId },
      data: { verified },
    });
  } else {
    throw new AppError('VALIDATION_ERROR', 'User is not a seller role', 400);
  }

  await writeAdminAudit(adminId, 'VERIFY', 'SellerProfile', userId, before, after);
  return { userId, verified };
}
