/** Integer paisa (1 BDT = 100 paisa), round-half-up from decimal strings. */

const MONEY_SCALE = 2n;
const PAISA_PER_UNIT = 100n;

export function toPaisa(amount: string | number): bigint {
  const normalized =
    typeof amount === 'number' ? amount.toFixed(2) : amount.trim().replace(/,/g, '');

  if (!/^-?\d+(\.\d{0,2})?$/.test(normalized)) {
    throw new Error(`Invalid money amount: ${amount}`);
  }

  const negative = normalized.startsWith('-');
  const raw = negative ? normalized.slice(1) : normalized;
  const [whole, frac = ''] = raw.split('.');
  const fracPadded = `${frac}00`.slice(0, 2);
  const paisa = BigInt(whole) * PAISA_PER_UNIT + BigInt(fracPadded);
  return negative ? -paisa : paisa;
}

export function fromPaisa(paisa: bigint): string {
  const negative = paisa < 0n;
  const abs = negative ? -paisa : paisa;
  const whole = abs / PAISA_PER_UNIT;
  const frac = abs % PAISA_PER_UNIT;
  const fracStr = frac.toString().padStart(Number(MONEY_SCALE), '0');
  return `${negative ? '-' : ''}${whole}.${fracStr}`;
}

/** Split line total into seller share and platform commission (bps). seller + commission === lineTotal. */
export function splitCommission(
  lineTotalPaisa: bigint,
  bps: number,
): {
  sellerPaisa: bigint;
  commissionPaisa: bigint;
} {
  if (bps < 0 || bps > 10_000 || !Number.isInteger(bps)) {
    throw new Error(`Invalid commission bps: ${bps}`);
  }
  if (lineTotalPaisa < 0n) {
    throw new Error('lineTotalPaisa must be non-negative');
  }

  const commissionPaisa = (lineTotalPaisa * BigInt(bps) + 5000n) / 10000n;
  const sellerPaisa = lineTotalPaisa - commissionPaisa;
  return { sellerPaisa, commissionPaisa };
}
