import { describe, expect, it } from 'vitest';
import { fromPaisa, toPaisa } from '@bookverse/shared';
import { prisma } from './lib/prisma.js';
import { getAdminKpis, updateSystemSetting } from './services/dashboard/adminDashboardService.js';
import { sumSellerSaleBalance } from './services/dashboard/sellerBalanceService.js';

const runDb = Boolean(process.env.DATABASE_URL) && process.env.HEALTH_SKIP_INFRA !== 'true';

describe.runIf(runDb)('dashboard KPI consistency', () => {
  it('admin GMV matches order totals in seed-like conditions', async () => {
    const orders = await prisma.order.findMany({
      where: { status: { notIn: ['CANCELLED', 'REFUNDED', 'PENDING_PAYMENT'] } },
      select: { total: true },
    });
    const expectedGmv = fromPaisa(orders.reduce((s, o) => s + toPaisa(o.total.toString()), 0n));
    const kpis = await getAdminKpis();
    expect(kpis.gmvBdt).toBe(expectedGmv);
    expect(kpis.orderCount).toBe(orders.length);
  });

  it('seller balance sums match ledger SALE rows', async () => {
    const seller = await prisma.user.findFirst({
      where: { role: { in: ['PUBLISHER', 'VENDOR', 'WRITER'] } },
    });
    if (!seller) return;
    const pending = await sumSellerSaleBalance(seller.id, 'PENDING');
    const rows = await prisma.ledgerEntry.findMany({
      where: { ownerId: seller.id, kind: 'SALE', status: 'PENDING', payoutId: null },
    });
    const sum = fromPaisa(rows.reduce((s, r) => s + toPaisa(r.amount.toString()), 0n));
    expect(pending).toBe(sum);
  });

  it('admin system setting update writes audit log', async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    expect(admin).toBeTruthy();
    const key = 'min_order_bdt';
    await updateSystemSetting(admin!.id, key, '100.00');
    const log = await prisma.adminAuditLog.findFirst({
      where: { entity: 'SystemSetting', entityId: key, adminId: admin!.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });
});
