import { describe, expect, it } from 'vitest';
import {
  isRuleValidNow,
  ruleMatches,
  selectCommissionRule,
  type CommissionContext,
  type CommissionRuleRow,
} from './commissionService.js';

function rule(
  partial: Partial<CommissionRuleRow> & Pick<CommissionRuleRow, 'scope' | 'bps'>,
): CommissionRuleRow {
  return {
    id: partial.id ?? partial.scope,
    scope: partial.scope,
    scopeRef: partial.scopeRef ?? null,
    bps: partial.bps,
    priority: partial.priority ?? 0,
    validFrom: partial.validFrom ?? new Date('2020-01-01T00:00:00.000Z'),
    validTo: partial.validTo ?? null,
    active: partial.active ?? true,
  };
}

const baseCtx: CommissionContext = {
  sellerType: 'PUBLISHER',
  sellerId: 'pub-1',
  genreSlug: 'fiction',
  isUsed: false,
  publisherFounding: true,
  publisherVerified: true,
  now: new Date('2026-03-01T00:00:00.000Z'),
};

describe('commission resolution (Appendix D)', () => {
  const seed = [
    rule({ scope: 'GLOBAL', bps: 1000, priority: 0 }),
    rule({
      scope: 'ROLE',
      scopeRef: 'PUBLISHER_FOUNDING',
      bps: 400,
      priority: 30,
      validTo: new Date('2026-07-01T00:00:00.000Z'),
    }),
    rule({
      scope: 'ROLE',
      scopeRef: 'PUBLISHER_VERIFIED',
      bps: 600,
      priority: 20,
      validTo: new Date('2026-07-01T00:00:00.000Z'),
    }),
    rule({
      scope: 'ROLE',
      scopeRef: 'WRITER',
      bps: 600,
      priority: 10,
      validTo: new Date('2026-07-01T00:00:00.000Z'),
    }),
    rule({
      scope: 'ROLE',
      scopeRef: 'VENDOR',
      bps: 800,
      priority: 10,
      validTo: new Date('2026-07-01T00:00:00.000Z'),
    }),
    rule({ scope: 'LISTING_TYPE', scopeRef: 'USED', bps: 1000, priority: 40 }),
  ];

  it('founding publisher gets 4% while offer valid', () => {
    const selected = selectCommissionRule(seed, baseCtx);
    expect(selected?.bps).toBe(400);
  });

  it('after validTo, GLOBAL 10% applies', () => {
    const selected = selectCommissionRule(seed, {
      ...baseCtx,
      now: new Date('2026-08-01T00:00:00.000Z'),
    });
    expect(selected?.bps).toBe(1000);
  });

  it('verified (non-founding) publisher gets 6%', () => {
    const selected = selectCommissionRule(seed, {
      ...baseCtx,
      publisherFounding: false,
      publisherVerified: true,
    });
    expect(selected?.bps).toBe(600);
  });

  it('LISTING USED beats ROLE for used books', () => {
    const selected = selectCommissionRule(seed, {
      ...baseCtx,
      sellerType: 'VENDOR',
      isUsed: true,
      publisherFounding: false,
      publisherVerified: false,
    });
    expect(selected?.bps).toBe(1000);
  });

  it('writer launch offer 6%', () => {
    const selected = selectCommissionRule(seed, {
      ...baseCtx,
      sellerType: 'WRITER',
      publisherFounding: false,
      publisherVerified: false,
    });
    expect(selected?.bps).toBe(600);
  });

  it('vendor launch offer 8%', () => {
    const selected = selectCommissionRule(seed, {
      ...baseCtx,
      sellerType: 'VENDOR',
      publisherFounding: false,
      publisherVerified: false,
    });
    expect(selected?.bps).toBe(800);
  });

  it('higher priority wins among same specificity', () => {
    const a = rule({ scope: 'ROLE', scopeRef: 'WRITER', bps: 500, priority: 1 });
    const b = rule({ scope: 'ROLE', scopeRef: 'WRITER', bps: 700, priority: 99 });
    const selected = selectCommissionRule([a, b], {
      ...baseCtx,
      sellerType: 'WRITER',
      publisherFounding: false,
    });
    expect(selected?.bps).toBe(700);
  });

  it('expired rules do not match', () => {
    const expired = rule({
      scope: 'ROLE',
      scopeRef: 'WRITER',
      bps: 100,
      validTo: new Date('2025-01-01T00:00:00.000Z'),
    });
    expect(isRuleValidNow(expired, new Date('2026-03-01T00:00:00.000Z'))).toBe(false);
    expect(ruleMatches(seed[0]!, baseCtx)).toBe(true);
  });
});
