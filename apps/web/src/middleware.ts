import { defineMiddleware } from 'astro:middleware';

const PRIVATE_PREFIXES = ['/verify-phone', '/account'];

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
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
