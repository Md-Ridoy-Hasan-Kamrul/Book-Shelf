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

  it('maps built-in Cloudinary books', () => {
    expect(remoteBookPdfUrl('golpe-golpe-vocabulary')).toMatch(
      /^https:\/\/res\.cloudinary\.com\/djiedtnex\//,
    );
    expect(remoteBookPdfUrl('psychology-of-money')).toMatch(
      /^https:\/\/res\.cloudinary\.com\/djiedtnex\//,
    );
    expect(remoteBookPdfUrl('ai-prompt-engineering')).toMatch(/AI_Prompt_Engineering\.pdf$/);
    expect(remoteBookPdfUrl('thinking-fast-and-slow')).toMatch(
      /Daniel_Kahneman-Thinking_Fast_and_Slow\.pdf$/,
    );
    expect(remoteBookPdfUrl('psychology-of-persuasion')).toMatch(
      /The_Psychology_of_Persuasion\.pdf$/,
    );
    expect(remoteBookPdfUrl('mans-search-for-meaning')).toMatch(/Man_s_Search_for_Meaning\.pdf$/);
    expect(remoteBookPdfUrl('the-body-keeps-the-score')).toMatch(/The_Body_Keeps_the_Score\.pdf$/);
  });
});
