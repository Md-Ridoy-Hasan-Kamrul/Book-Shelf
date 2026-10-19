import { describe, expect, test } from 'vitest';
import { fromPaisa, toPaisa } from '@bookverse/shared';

function metrics(input: {
  impressions: number;
  clicks: number;
  purchases: number;
  revenueBdt: string;
  costBdt: string;
}) {
  const ctr = input.impressions > 0 ? input.clicks / input.impressions : 0;
  const conversion = input.clicks > 0 ? input.purchases / input.clicks : 0;
  const revenuePaisa = toPaisa(input.revenueBdt);
  const costPaisa = toPaisa(input.costBdt);
  const roas = costPaisa > 0n ? Number(revenuePaisa) / Number(costPaisa) : 0;
  return {
    ctr: Number(ctr.toFixed(4)),
    conversion: Number(conversion.toFixed(4)),
    revenue: fromPaisa(revenuePaisa),
    cost: input.costBdt,
    roas: Number(roas.toFixed(4)),
  };
}

describe('campaign metrics (seed contract)', () => {
  test('matches seeded 100/20/2 events with 1000 revenue and 1000 cost', () => {
    const m = metrics({
      impressions: 100,
      clicks: 20,
      purchases: 2,
      revenueBdt: '1000.00',
      costBdt: '1000.00',
    });
    expect(m.ctr).toBe(0.2);
    expect(m.conversion).toBe(0.1);
    expect(m.revenue).toBe('1000.00');
    expect(m.cost).toBe('1000.00');
    expect(m.roas).toBe(1);
  });
});
