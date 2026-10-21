import { existsSync } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo-root `content/pdfs/<slug>.pdf`. */
export function pdfContentRoot(): string {
  const fromModule = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    'content',
    'pdfs',
  );
  const candidates = [
    fromModule,
    path.resolve(process.cwd(), 'content', 'pdfs'),
    path.resolve(process.cwd(), '..', 'content', 'pdfs'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return fromModule;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Public CDN URLs only. Override via BOOK_PDF_REMOTE_URLS JSON. */
const DEFAULT_REMOTE_PDF_URLS: Record<string, string> = {
  'golpe-golpe-vocabulary':
    'https://res.cloudinary.com/djiedtnex/image/upload/v1792571639/%E0%A6%97%E0%A6%B2%E0%A7%8D%E0%A6%AA%E0%A7%87-%E0%A6%97%E0%A6%B2%E0%A7%8D%E0%A6%AA%E0%A7%87-Voocabulary.pdf',
  'psychology-of-money':
    'https://res.cloudinary.com/djiedtnex/image/upload/v1792577081/%E0%A6%A6%E0%A7%8D%E0%A6%AF_%E0%A6%B8%E0%A6%BE%E0%A6%87%E0%A6%95%E0%A7%8B%E0%A6%B2%E0%A6%9C%E0%A6%BF_%E0%A6%85%E0%A6%AC_%E0%A6%AE%E0%A6%BE%E0%A6%A8%E0%A6%BF.pdf',
};

const REMOTE_HOST_ALLOWLIST = new Set(['res.cloudinary.com']);

function parseRemoteUrlMap(): Record<string, string> {
  const raw = process.env.BOOK_PDF_REMOTE_URLS?.trim();
  if (!raw) return { ...DEFAULT_REMOTE_PDF_URLS };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEFAULT_REMOTE_PDF_URLS };
    }
    const out = { ...DEFAULT_REMOTE_PDF_URLS };
    for (const [slug, url] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof url === 'string' && SLUG_RE.test(slug) && isAllowedRemotePdfUrl(url)) {
        out[slug] = url;
      }
    }
    return out;
  } catch {
    return { ...DEFAULT_REMOTE_PDF_URLS };
  }
}

export function isAllowedRemotePdfUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && REMOTE_HOST_ALLOWLIST.has(u.hostname);
  } catch {
    return false;
  }
}

export function remoteBookPdfUrl(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return null;
  const url = parseRemoteUrlMap()[slug];
  if (!url || !isAllowedRemotePdfUrl(url)) return null;
  return url;
}

export function resolveBookPdfPath(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return null;
  const root = pdfContentRoot();
  const full = path.resolve(root, `${slug}.pdf`);
  if (!full.startsWith(root + path.sep) && full !== root) return null;
  return full;
}

export async function bookPdfExists(slug: string): Promise<boolean> {
  if (remoteBookPdfUrl(slug)) return true;
  const full = resolveBookPdfPath(slug);
  if (!full) return false;
  try {
    await access(full);
    return true;
  } catch {
    return false;
  }
}

async function fetchRemotePdf(slug: string): Promise<{ data: Buffer; filename: string } | null> {
  const url = remoteBookPdfUrl(slug);
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/pdf,*/*' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const data = Buffer.from(await res.arrayBuffer());
    if (data.byteLength < 5) return null;
    if (data.subarray(0, 4).toString('latin1') !== '%PDF') return null;
    return { data, filename: `${slug}.pdf` };
  } catch {
    return null;
  }
}

export async function readBookPdf(
  slug: string,
): Promise<{ data: Buffer; filename: string } | null> {
  const full = resolveBookPdfPath(slug);
  if (full) {
    try {
      const data = await readFile(full);
      return { data, filename: `${slug}.pdf` };
    } catch {
      /* fall through to remote */
    }
  }
  return fetchRemotePdf(slug);
}

export function pdfReadOnlyHeaders(filename: string, byteLength: number): Record<string, string> {
  return {
    'Content-Type': 'application/pdf',
    'Content-Length': String(byteLength),
    'Content-Disposition': `inline; filename="${filename}"`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  };
}
