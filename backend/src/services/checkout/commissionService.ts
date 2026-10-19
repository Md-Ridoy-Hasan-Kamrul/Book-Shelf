import type { SellerType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export type CommissionScope = 'GLOBAL' | 'ROLE' | 'SELLER' | 'CATEGORY' | 'LISTING_TYPE';

/** Higher = more specific (Appendix D: most specific valid rule wins). */
export const SCOPE_SPECIFICITY: Record<CommissionScope, number> = {
  GLOBAL: 10,
  ROLE: 20,
  CATEGORY: 30,
  LISTING_TYPE: 40,
  SELLER: 50,
};

export type CommissionContext = {
  sellerType: SellerType;
  sellerId: string;
  genreSlug: string;
  isUsed: boolean;
  publisherFounding?: boolean;
  publisherVerified?: boolean;
  /** Override "now" for tests / TEST_CLOCK_ISO. */
  now?: Date;
};

export type CommissionRuleRow = {
  id: string;
  scope: string;
  scopeRef: string | null;
  bps: number;
  priority: number;
  validFrom: Date;
  validTo: Date | null;
  active: boolean;
};

export function ruleMatches(rule: CommissionRuleRow, ctx: CommissionContext): boolean {
  switch (rule.scope as CommissionScope) {
    case 'GLOBAL':
      return true;
    case 'ROLE':
      if (rule.scopeRef === 'WRITER') return ctx.sellerType === 'WRITER';
      if (rule.scopeRef === 'VENDOR') return ctx.sellerType === 'VENDOR';
      if (rule.scopeRef === 'PUBLISHER_VERIFIED') {
        return ctx.sellerType === 'PUBLISHER' && Boolean(ctx.publisherVerified);
      }
      if (rule.scopeRef === 'PUBLISHER_FOUNDING') {
        return ctx.sellerType === 'PUBLISHER' && Boolean(ctx.publisherFounding);
      }
      return false;
    case 'CATEGORY':
      return rule.scopeRef === ctx.genreSlug;
    case 'LISTING_TYPE':
      if (rule.scopeRef === 'USED') return ctx.isUsed;
      if (rule.scopeRef === 'NEW') return !ctx.isUsed;
      return false;
    case 'SELLER':
      return rule.scopeRef === ctx.sellerId;
    default:
      return false;
  }
}

export function isRuleValidNow(rule: CommissionRuleRow, now: Date): boolean {
  if (!rule.active) return false;
  if (rule.validFrom.getTime() > now.getTime()) return false;
  if (rule.validTo && rule.validTo.getTime() <= now.getTime()) return false;
  return true;
}

/**
 * Most specific valid rule wins; ties by higher priority.
 * Never hard-codes bps — caller must seed a GLOBAL rule.
 */
export function selectCommissionRule(
  rules: CommissionRuleRow[],
  ctx: CommissionContext,
): CommissionRuleRow | null {
  const now = ctx.now ?? resolveNow();
  const matched = rules.filter((r) => isRuleValidNow(r, now) && ruleMatches(r, ctx));
  if (matched.length === 0) return null;

  matched.sort((a, b) => {
    const sa = SCOPE_SPECIFICITY[a.scope as CommissionScope] ?? 0;
    const sb = SCOPE_SPECIFICITY[b.scope as CommissionScope] ?? 0;
    if (sb !== sa) return sb - sa;
    return b.priority - a.priority;
  });
  return matched[0] ?? null;
}

function resolveNow(): Date {
  const iso = process.env.TEST_CLOCK_ISO?.trim();
  if (iso && process.env.NODE_ENV !== 'production') {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

async function loadPublisherFlags(sellerId: string, sellerType: SellerType) {
  if (sellerType !== 'PUBLISHER' || !sellerId) {
    return { publisherFounding: false, publisherVerified: false };
  }
  const profile = await prisma.publisherProfile.findUnique({
    where: { userId: sellerId },
    select: { founding: true, verified: true },
  });
  return {
    publisherFounding: Boolean(profile?.founding),
    publisherVerified: Boolean(profile?.verified),
  };
}

/**
 * Resolve commission bps at checkout; snapshot onto OrderLineItem.
 * After ROLE validTo expires, only GLOBAL (10%) remains — automatic.
 */
export async function resolveCommissionBps(
  sellerTypeOrCtx: SellerType | CommissionContext,
  genreSlug?: string,
): Promise<number> {
  let ctx: CommissionContext;
  if (typeof sellerTypeOrCtx === 'string') {
    ctx = {
      sellerType: sellerTypeOrCtx,
      sellerId: '',
      genreSlug: genreSlug ?? '',
      isUsed: sellerTypeOrCtx === 'USER',
    };
  } else {
    ctx = sellerTypeOrCtx;
  }

  if (ctx.publisherFounding === undefined || ctx.publisherVerified === undefined) {
    const flags = await loadPublisherFlags(ctx.sellerId, ctx.sellerType);
    ctx = { ...ctx, ...flags };
  }

  if (!ctx.now) {
    ctx = { ...ctx, now: resolveNow() };
  }

  const rules = await prisma.commissionRule.findMany({
    where: { active: true },
  });
  const selected = selectCommissionRule(rules, ctx);
  if (!selected) {
    // Emergency only — seed must always include GLOBAL 1000
    return 1000;
  }
  return selected.bps;
}
