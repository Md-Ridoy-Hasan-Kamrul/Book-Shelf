import { existsSync } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Repo-root `content/pdfs/` (never under public/uploads).
 * Resolves from this file OR cwd so `pnpm dev` from repo root or frontend both work.
 */
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

export function resolveBookPdfPath(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return null;
  const root = pdfContentRoot();
  const full = path.resolve(root, `${slug}.pdf`);
  if (!full.startsWith(root + path.sep) && full !== root) return null;
  return full;
}

export function bookPdfExistsSync(slug: string): boolean {
  const full = resolveBookPdfPath(slug);
  if (!full) return false;
  return existsSync(full);
}

export async function bookPdfExists(slug: string): Promise<boolean> {
  const full = resolveBookPdfPath(slug);
  if (!full) return false;
  try {
    await access(full);
    return true;
  } catch {
    return false;
  }
}

export async function readBookPdf(
  slug: string,
): Promise<{ data: Buffer; filename: string } | null> {
  const full = resolveBookPdfPath(slug);
  if (!full) return null;
  try {
    const data = await readFile(full);
    return { data, filename: `${slug}.pdf` };
  } catch {
    return null;
  }
}

/** Headers that prefer in-browser view and discourage Save As. */
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
