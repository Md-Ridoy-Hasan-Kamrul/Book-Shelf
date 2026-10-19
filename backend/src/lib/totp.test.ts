import { describe, expect, test } from 'vitest';
import { generateTotpSecret, totpAt, verifyTotp } from './totp.js';

describe('totp', () => {
  test('round-trips current code', () => {
    const secret = generateTotpSecret();
    const code = totpAt(secret);
    expect(verifyTotp(secret, code)).toBe(true);
    expect(verifyTotp(secret, '000000')).toBe(false);
  });
});
