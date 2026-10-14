import { describe, expect, it } from 'vitest';
import { fromPaisa, splitCommission, toPaisa } from './paisa.js';

describe('toPaisa / fromPaisa', () => {
  it('round-trips common BDT amounts', () => {
    expect(fromPaisa(toPaisa('0'))).toBe('0.00');
    expect(fromPaisa(toPaisa('12.34'))).toBe('12.34');
    expect(fromPaisa(toPaisa(99.995))).toBe('100.00');
  });

  it('rejects invalid strings', () => {
    expect(() => toPaisa('12.345')).toThrow();
    expect(() => toPaisa('abc')).toThrow();
  });
});

describe('splitCommission', () => {
  it('splits exactly for simple bps', () => {
    const total = toPaisa('1000.00');
    const { sellerPaisa, commissionPaisa } = splitCommission(total, 1000);
    expect(sellerPaisa + commissionPaisa).toBe(total);
    expect(fromPaisa(commissionPaisa)).toBe('100.00');
    expect(fromPaisa(sellerPaisa)).toBe('900.00');
  });

  it('1000 random cases: seller + commission equals line total', () => {
    for (let i = 0; i < 1000; i++) {
      const paisa = BigInt(Math.floor(Math.random() * 50_000_000));
      const bps = Math.floor(Math.random() * 10_001);
      const { sellerPaisa, commissionPaisa } = splitCommission(paisa, bps);
      expect(sellerPaisa + commissionPaisa).toBe(paisa);
      expect(sellerPaisa).toBeGreaterThanOrEqual(0n);
      expect(commissionPaisa).toBeGreaterThanOrEqual(0n);
    }
  });
});
