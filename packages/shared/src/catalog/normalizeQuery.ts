/** Bangla numerals → ASCII; collapse whitespace for search. */
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export function normalizeSearchQuery(raw: string): string {
  let q = raw.trim().normalize('NFC');
  if (!q) return '';

  const chars = [...q];
  for (let i = 0; i < chars.length; i++) {
    const bnIndex = BN_DIGITS.indexOf(chars[i] ?? '');
    if (bnIndex >= 0) {
      chars[i] = String(bnIndex);
    }
  }
  q = chars.join('').replace(/\s+/g, ' ').trim();
  return q;
}
