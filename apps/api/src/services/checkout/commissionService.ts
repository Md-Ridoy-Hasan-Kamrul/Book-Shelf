import type { SellerType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export async function resolveCommissionBps(
  sellerType: SellerType,
  genreSlug: string,
): Promise<number> {
  const rules = await prisma.commissionRule.findMany({
    where: { active: true },
    orderBy: { priority: 'asc' },
  });
  for (const rule of rules) {
    const typeOk = rule.sellerType == null || rule.sellerType === sellerType;
    const genreOk = rule.genreSlug == null || rule.genreSlug === genreSlug;
    if (typeOk && genreOk) {
      return rule.bps;
    }
  }
  return 1000;
}
