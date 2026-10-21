import { describe, expect, it } from 'vitest';
import { resolveBookPdfPath } from './bookPdfService.js';

describe('resolveBookPdfPath', () => {
  it('rejects path traversal and invalid slugs', () => {
    expect(resolveBookPdfPath('../secret')).toBeNull();
    expect(resolveBookPdfPath('..\\secret')).toBeNull();
    expect(resolveBookPdfPath('a/b')).toBeNull();
    expect(resolveBookPdfPath('Padma')).toBeNull();
    expect(resolveBookPdfPath('padma-nodir-majhi')).toMatch(/padma-nodir-majhi\.pdf$/);
  });
});
