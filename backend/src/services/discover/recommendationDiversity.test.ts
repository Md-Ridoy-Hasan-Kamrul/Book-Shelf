import { describe, expect, test } from 'vitest';

/** Mirrors recommendationService diversifyByAuthor constraint. */
function diversifyByAuthor<T extends { author: string }>(
  items: T[],
  limit: number,
  maxPer = 5,
): T[] {
  const counts = new Map<string, number>();
  const out: T[] = [];
  for (const item of items) {
    const n = counts.get(item.author) ?? 0;
    if (n >= maxPer) continue;
    counts.set(item.author, n + 1);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

describe('recommendation diversity', () => {
  test('caps at five books per author', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      author: i < 12 ? 'Same Author' : `Author ${i}`,
    }));
    const out = diversifyByAuthor(items, 12);
    const same = out.filter((x) => x.author === 'Same Author');
    expect(same).toHaveLength(5);
    expect(out.length).toBeLessThanOrEqual(12);
  });
});
