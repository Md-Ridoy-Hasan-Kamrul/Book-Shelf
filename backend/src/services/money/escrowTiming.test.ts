import { describe, expect, it } from 'vitest';
import { codEscrowStart, escrowAvailableAt, maxDate } from './escrowTiming.js';

describe('escrowTiming (Appendix C)', () => {
  it('escrowAvailableAt adds whole days', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    expect(escrowAvailableAt(start, 7).toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('COD start is max(deliveredAt, remittedAt)', () => {
    const delivered = new Date('2026-01-05T00:00:00.000Z');
    const remitted = new Date('2026-01-07T00:00:00.000Z');
    expect(codEscrowStart(delivered, remitted)).toEqual(remitted);
    expect(codEscrowStart(remitted, delivered)).toEqual(remitted);
    expect(codEscrowStart(null, remitted)).toEqual(remitted);
    expect(maxDate(delivered, remitted)).toEqual(remitted);
  });
});
