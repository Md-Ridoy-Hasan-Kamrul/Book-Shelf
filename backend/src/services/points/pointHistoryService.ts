import { prisma } from '../../lib/prisma.js';
import { cursorWhere, encodeCursor } from '../../lib/cursorPagination.js';

export async function listPointHistory(userId: string, cursor?: string, limit = 30) {
  const take = limit + 1;
  const rows = await prisma.pointLedger.findMany({
    where: { userId, ...(cursorWhere(cursor) ?? {}) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { pointsBalance: true },
  });
  return {
    pointsBalance: user.pointsBalance,
    items: page.map((r) => ({
      id: r.id,
      delta: r.delta,
      kind: r.kind,
      reason: r.reason,
      refId: r.refId,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

/** Acceptance: pointsBalance === SUM(PointLedger.delta) for a user. */
export async function verifyUserPointBalance(userId: string): Promise<{
  ok: boolean;
  pointsBalance: number;
  sumDelta: number;
}> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { pointsBalance: true },
  });
  const agg = await prisma.pointLedger.aggregate({
    where: { userId },
    _sum: { delta: true },
  });
  const sumDelta = agg._sum.delta ?? 0;
  return {
    ok: user.pointsBalance === sumDelta,
    pointsBalance: user.pointsBalance,
    sumDelta,
  };
}
