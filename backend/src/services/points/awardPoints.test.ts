import { describe, expect, it } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { awardPoints } from './awardPoints.js';
import { verifyUserPointBalance } from './pointHistoryService.js';

const runDb = Boolean(process.env.DATABASE_URL) && process.env.HEALTH_SKIP_INFRA !== 'true';

describe.runIf(runDb)('awardPoints (P12)', () => {
  it('concurrent awards never double-count', async () => {
    const user = await prisma.user.findFirst({ where: { role: 'USER' } });
    expect(user).toBeTruthy();
    const ref = `concurrent-${Date.now()}`;
    const results = await Promise.all([
      awardPoints(user!.id, 'ADJUSTMENT', ref, 5, { kind: 'ADJUSTMENT', note: 'c1' }),
      awardPoints(user!.id, 'ADJUSTMENT', ref, 5, { kind: 'ADJUSTMENT', note: 'c2' }),
      awardPoints(user!.id, 'ADJUSTMENT', ref, 5, { kind: 'ADJUSTMENT', note: 'c3' }),
    ]);
    const awarded = results.filter((r) => r.awarded).length;
    expect(awarded).toBe(1);
    const ledger = await prisma.pointLedger.count({
      where: { userId: user!.id, reason: 'ADJUSTMENT', refId: ref },
    });
    expect(ledger).toBe(1);
    const check = await verifyUserPointBalance(user!.id);
    expect(check.ok).toBe(true);
  });

  it('balance equals SUM(delta) and balanceAfter snapshot', async () => {
    const user = await prisma.user.findFirst({ where: { role: 'USER' } });
    expect(user).toBeTruthy();
    const ref = `sum-${Date.now()}`;
    const result = await awardPoints(user!.id, 'ADJUSTMENT', ref, 3, {
      kind: 'ADJUSTMENT',
    });
    const check = await verifyUserPointBalance(user!.id);
    expect(check.ok).toBe(true);
    expect(check.pointsBalance).toBe(check.sumDelta);
    const row = await prisma.pointLedger.findUniqueOrThrow({
      where: { userId_reason_refId: { userId: user!.id, reason: 'ADJUSTMENT', refId: ref } },
    });
    expect(row.balanceAfter).toBe(result.pointsBalance);
  });
});
