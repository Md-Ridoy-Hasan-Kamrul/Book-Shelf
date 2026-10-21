import { describe, expect, it } from 'vitest';
import { isAllowedRemotePdfUrl, remoteBookPdfUrl, resolveBookPdfPath } from './bookPdfService.js';

describe('resolveBookPdfPath', () => {
  it('rejects path traversal and invalid slugs', () => {
    expect(resolveBookPdfPath('../secret')).toBeNull();
    expect(resolveBookPdfPath('..\\secret')).toBeNull();
    expect(resolveBookPdfPath('a/b')).toBeNull();
    expect(resolveBookPdfPath('Padma')).toBeNull();
    expect(resolveBookPdfPath('padma-nodir-majhi')).toMatch(/padma-nodir-majhi\.pdf$/);
  });
});

describe('remote Cloudinary PDF URLs', () => {
  it('allowlists only Cloudinary HTTPS delivery hosts', () => {
    expect(isAllowedRemotePdfUrl('https://res.cloudinary.com/demo/image/upload/v1/a.pdf')).toBe(
      true,
    );
    expect(isAllowedRemotePdfUrl('http://res.cloudinary.com/demo/a.pdf')).toBe(false);
    expect(isAllowedRemotePdfUrl('https://evil.example/a.pdf')).toBe(false);
  });

  it('maps golpe-golpe-vocabulary to the default Cloudinary URL', () => {
    const url = remoteBookPdfUrl('golpe-golpe-vocabulary');
    expect(url).toMatch(/^https:\/\/res\.cloudinary\.com\/djiedtnex\//);
  });
});
