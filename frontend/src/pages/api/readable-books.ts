import type { APIRoute } from 'astro';
import { readdir } from 'node:fs/promises';
import { mockAllBooks } from '../../lib/mockCatalog';
import { pdfContentRoot } from '../../lib/bookPdf';

export const prerender = false;

/** Lists books that have a PDF in `content/pdfs/` for the homepage strip. */
export const GET: APIRoute = async () => {
  let pdfSlugs = new Set<string>();
  try {
    const files = await readdir(pdfContentRoot());
    pdfSlugs = new Set(
      files.filter((f) => f.endsWith('.pdf')).map((f) => f.replace(/\.pdf$/i, '')),
    );
  } catch {
    pdfSlugs = new Set();
  }

  const books = mockAllBooks()
    .filter((b) => pdfSlugs.has(b.slug))
    .map((b) => ({
      slug: b.slug,
      title: b.title,
      titleBn: b.titleBn,
      author: b.author,
    }));

  return new Response(JSON.stringify({ items: books }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
