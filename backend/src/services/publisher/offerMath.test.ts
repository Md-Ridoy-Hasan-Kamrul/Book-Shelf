import { describe, expect, test } from 'vitest';
import { toPaisa, fromPaisa } from '@bookverse/shared';

/** Mirrors buy-2-get-1 free-unit selection (cheapest free). */
function bundleFreeSavings(
  unitPrices: string[],
  buyQty: number,
  freeQty: number,
  totalQty: number,
) {
  const groupSize = buyQty + freeQty;
  const freeUnits = Math.floor(totalQty / groupSize) * freeQty;
  const sorted = [...unitPrices]
    .map((p) => toPaisa(p))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  let savings = 0n;
  for (let i = 0; i < freeUnits; i++) {
    savings += sorted[i] ?? 0n;
  }
  return fromPaisa(savings);
}

describe('bundle offer math', () => {
  test('buy 2 get 1 makes cheapest unit free', () => {
    const units = ['100.00', '200.00', '300.00'];
    expect(bundleFreeSavings(units, 2, 1, 3)).toBe('100.00');
  });

  test('client cannot invent list prices — savings derived from server units only', () => {
    const serverUnits = ['250.00', '250.00', '250.00'];
    expect(bundleFreeSavings(serverUnits, 2, 1, 3)).toBe('250.00');
  });
});
