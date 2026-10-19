const ALLOWED_HOSTS = new Set([
  'openlibrary.org',
  'covers.openlibrary.org',
  'www.googleapis.com',
  'books.google.com',
  'books.googleusercontent.com',
]);

/**
 * Block SSRF: only allow HTTPS fetches to known ISBN/cover hosts.
 * Rejects private IPs, non-https, and arbitrary hosts.
 */
export function assertSafeExternalUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.protocol !== 'https:') {
    throw new Error('Only https URLs allowed');
  }
  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    throw new Error(`Host not allowlisted: ${host}`);
  }
  // Block obvious SSRF to metadata / localhost via crafted host (allowlist already covers)
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.startsWith('169.254.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.')
  ) {
    throw new Error('Private network host blocked');
  }
  return url;
}

export async function safeFetch(raw: string, init?: RequestInit): Promise<Response | null> {
  try {
    const url = assertSafeExternalUrl(raw);
    return await fetch(url, {
      ...init,
      redirect: 'error',
      signal: init?.signal ?? AbortSignal.timeout(8000),
    });
  } catch {
    return null;
  }
}
