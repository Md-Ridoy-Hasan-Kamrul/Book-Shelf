import { prisma } from '../../lib/prisma.js';

const cache = new Map<string, unknown>();

/** Appendix C key names ↔ legacy seed keys (try primary then aliases). */
const KEY_ALIASES: Record<string, string[]> = {
  claim_window_hours: ['claim_window_hours'],
  escrow_days: ['escrow_days'],
  min_payout_amount: ['min_payout_amount', 'payout_min_bdt'],
  payout_min_bdt: ['payout_min_bdt', 'min_payout_amount'],
  cod_new_user_cap: ['cod_new_user_cap', 'cod_new_user_max_bdt'],
  cod_new_user_max_bdt: ['cod_new_user_max_bdt', 'cod_new_user_cap'],
  cod_min_trust: ['cod_min_trust', 'cod_trust_score_min'],
  cod_trust_score_min: ['cod_trust_score_min', 'cod_min_trust'],
};

function lookupKeys(key: string): string[] {
  return KEY_ALIASES[key] ?? [key];
}

export async function getSystemSetting<T>(key: string, fallback: T): Promise<T> {
  if (cache.has(key)) {
    return cache.get(key) as T;
  }
  for (const k of lookupKeys(key)) {
    if (cache.has(k)) {
      const v = cache.get(k) as T;
      cache.set(key, v);
      return v;
    }
    const row = await prisma.systemSetting.findUnique({ where: { key: k } });
    if (row?.value !== undefined) {
      const value = row.value as T;
      cache.set(key, value);
      cache.set(k, value);
      return value;
    }
  }
  cache.set(key, fallback);
  return fallback;
}

export function clearSettingsCache() {
  cache.clear();
}

export async function getMoneySetting(key: string, fallback: string): Promise<string> {
  const raw = await getSystemSetting<string | number>(key, fallback);
  return typeof raw === 'number' ? raw.toFixed(2) : String(raw);
}
