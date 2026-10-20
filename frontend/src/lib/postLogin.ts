/** Role → default destination after sign-in (no decorative dash separators). */

const SELLER = new Set(['VENDOR', 'PUBLISHER', 'WRITER']);

export function postLoginPath(role: string): string {
  const r = role.toUpperCase();
  if (r === 'ADMIN') return '/admin/dashboard';
  if (SELLER.has(r)) return '/seller/dashboard';
  return '/home';
}

/** Only same-origin relative paths. Reject protocol-relative `//…`. */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const next = raw.trim();
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export function resolvePostLogin(role: string, next?: string | null): string {
  return safeNextPath(next) ?? postLoginPath(role);
}
