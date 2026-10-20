import { describe, expect, it } from 'vitest';
import { postLoginPath, resolvePostLogin, safeNextPath } from './postLogin';

describe('postLoginPath', () => {
  it('sends readers to /home', () => {
    expect(postLoginPath('USER')).toBe('/home');
    expect(postLoginPath('MODERATOR')).toBe('/home');
  });

  it('sends sellers to seller dashboard', () => {
    expect(postLoginPath('VENDOR')).toBe('/seller/dashboard');
    expect(postLoginPath('PUBLISHER')).toBe('/seller/dashboard');
    expect(postLoginPath('WRITER')).toBe('/seller/dashboard');
  });

  it('sends admin to admin dashboard', () => {
    expect(postLoginPath('ADMIN')).toBe('/admin/dashboard');
  });
});

describe('safeNextPath', () => {
  it('allows same-origin relative paths', () => {
    expect(safeNextPath('/orders')).toBe('/orders');
    expect(safeNextPath('/home')).toBe('/home');
  });

  it('rejects open redirects', () => {
    expect(safeNextPath('https://evil.test')).toBeNull();
    expect(safeNextPath('//evil.test')).toBeNull();
    expect(safeNextPath('')).toBeNull();
  });
});

describe('resolvePostLogin', () => {
  it('prefers safe next over role default', () => {
    expect(resolvePostLogin('USER', '/orders')).toBe('/orders');
    expect(resolvePostLogin('ADMIN', null)).toBe('/admin/dashboard');
  });
});
