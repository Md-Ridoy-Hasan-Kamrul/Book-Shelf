/** Compute escrow release timestamp from a start instant + escrow_days. */
export function escrowAvailableAt(start: Date, escrowDays: number): Date {
  return new Date(start.getTime() + escrowDays * 24 * 60 * 60 * 1000);
}

/** Appendix C COD: availableAt base = max(deliveredAt, codRemittedAt). */
export function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

export function codEscrowStart(deliveredAt: Date | null | undefined, remittedAt: Date): Date {
  if (!deliveredAt) return remittedAt;
  return maxDate(deliveredAt, remittedAt);
}
