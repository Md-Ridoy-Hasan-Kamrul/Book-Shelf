import type { z } from 'zod';
import type { cartLineSchema } from '@bookverse/shared';

export type CartLine = z.infer<typeof cartLineSchema>;

export function mergeCartLines(items: CartLine[]): CartLine[] {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.listingId, (map.get(item.listingId) ?? 0) + item.qty);
  }
  return [...map.entries()].map(([listingId, qty]) => ({ listingId, qty }));
}
