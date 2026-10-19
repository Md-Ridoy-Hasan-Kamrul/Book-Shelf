import { describe, expect, it } from 'vitest';
import { splitCommission, toPaisa } from '@bookverse/shared';

/** Pure floor check mirroring marginGuard (fee 150bps + min margin 100bps). */
function floorPaisa(line: bigint, feeBps = 150, minMarginBps = 100): bigint {
  const fee = (line * BigInt(feeBps) + 5000n) / 10000n;
  const margin = (line * BigInt(minMarginBps) + 5000n) / 10000n;
  return fee + margin;
}

describe('margin guard (Appendix C)', () => {
  it('default 10% commission clears fee+margin floor', () => {
    const line = toPaisa('1000.00');
    const { commissionPaisa } = splitCommission(line, 1000);
    expect(commissionPaisa).toBeGreaterThanOrEqual(floorPaisa(line));
  });

  it('sellerAmount + commissionAmount === lineTotal', () => {
    const line = toPaisa('99.99');
    const { sellerPaisa, commissionPaisa } = splitCommission(line, 1250);
    expect(sellerPaisa + commissionPaisa).toBe(line);
  });

  it('too-low commission fails floor', () => {
    const line = toPaisa('1000.00');
    const { commissionPaisa } = splitCommission(line, 100); // 1%
    expect(commissionPaisa).toBeLessThan(floorPaisa(line));
  });
});
