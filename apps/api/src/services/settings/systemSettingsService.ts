import { prisma } from '../../lib/prisma.js';

const cache = new Map<string, unknown>();

export async function getSystemSetting<T>(key: string, fallback: T): Promise<T> {
  if (cache.has(key)) {
    return cache.get(key) as T;
  }
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  const value = row?.value !== undefined ? (row.value as T) : fallback;
  cache.set(key, value);
  return value;
}

export function clearSettingsCache() {
  cache.clear();
}

export async function getMoneySetting(key: string, fallback: string): Promise<string> {
  const raw = await getSystemSetting<string | number>(key, fallback);
  return typeof raw === 'number' ? raw.toFixed(2) : String(raw);
}
