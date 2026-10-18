import { describe, expect, it } from 'vitest';

describe('isbn normalize', () => {
  it('strips hyphens', () => {
    const raw = '978-0-123456-78-9';
    expect(raw.replace(/[-\s]/g, '')).toBe('9780123456789');
  });
});
