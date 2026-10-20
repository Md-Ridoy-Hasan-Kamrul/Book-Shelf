import { defineMiddleware } from 'astro:middleware';

const PRIVATE_PREFIXES = ['/verify-phone', '/account', '/seller/dashboard', '/admin/dashboard'];

function flagOn(name: string): boolean {
  const v = import.meta.env[name];
  return v === true || v === 'true' || v === '1';
}

function mockOn(): boolean {
  const v = import.meta.env.PUBLIC_USE_MOCK_DATA;
  if (v === false || v === 'false' || v === '0') return false;
  return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  // AGENTS rule 15: hide optional modules when FEATURE_* is off
  if (
    !flagOn('FEATURE_USED_BOOKS') &&
    (path === '/used' || path.startsWith('/sell/used') || path.startsWith('/sell/scan'))
  ) {
    return context.redirect('/');
  }
  if (!flagOn('FEATURE_SPONSORED') && path.startsWith('/publisher/growth')) {
    return context.redirect('/');
  }
  // Live AMA rooms only: public writer profiles stay reachable
  if (!flagOn('FEATURE_LIVE_EVENTS') && path.startsWith('/events')) {
    return context.redirect('/');
  }

  // Mock mode: no live /me: allow private pages with fixture user
  if (mockOn()) {
    return next();
  }

  const isPrivate = PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  if (!isPrivate) {
    return next();
  }

  const apiBase = import.meta.env.PUBLIC_API_URL ?? 'http://127.0.0.1:4321';
  const cookie = context.request.headers.get('cookie') ?? '';
  const res = await fetch(`${apiBase}/me`, {
    headers: { cookie, accept: 'application/json' },
  });

  if (!res.ok) {
    return context.redirect(`/login?next=${encodeURIComponent(path)}`);
  }

  return next();
});
