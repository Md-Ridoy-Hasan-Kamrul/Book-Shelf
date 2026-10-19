import { describe, expect, test } from 'vitest';
import { assertSafeExternalUrl } from './ssrfGuard.js';

describe('ssrfGuard', () => {
  test('allows Open Library / Google Books hosts', () => {
    expect(assertSafeExternalUrl('https://openlibrary.org/isbn/123.json').hostname).toBe(
      'openlibrary.org',
    );
    expect(
      assertSafeExternalUrl('https://www.googleapis.com/books/v1/volumes?q=isbn:1').hostname,
    ).toBe('www.googleapis.com');
  });

  test('rejects http, private hosts, and unknown domains', () => {
    expect(() => assertSafeExternalUrl('http://openlibrary.org/x')).toThrow(/https/);
    expect(() => assertSafeExternalUrl('https://evil.example/steal')).toThrow(/allowlisted/);
    expect(() => assertSafeExternalUrl('https://127.0.0.1/')).toThrow();
  });
});
