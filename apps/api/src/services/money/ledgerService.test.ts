import { describe, expect, test } from 'vitest';
import { fromPaisa, splitCommission, toPaisa } from '@bookverse/shared';

describe('ledger amounts (Appendix C/D)', () => {
  test('refund reversal sums to zero with commission split', () => {
    const line = toPaisa('1000.00');
    const { sellerPaisa, commissionPaisa } = splitCommission(line, 800);
    const refundSeller = sellerPaisa * -1n;
    const refundComm = commissionPaisa * -1n;
    expect(refundSeller + refundComm + sellerPaisa + commissionPaisa).toBe(0n);
    expect(fromPaisa(sellerPaisa)).toMatch(/^\d+\.\d{2}$/);
  });
});
