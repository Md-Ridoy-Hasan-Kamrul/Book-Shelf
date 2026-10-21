import type { APIRoute } from 'astro';
import { readdir } from 'node:fs/promises';
import { mockAllBooks } from '../../lib/mockCatalog';
import { pdfContentRoot, remoteBookPdfSlugs } from '../../lib/bookPdf';

export const prerender = false;

/** Lists books with a local or remote (Cloudinary) PDF for the homepage strip. */
export const GET: APIRoute = async () => {
  let pdfSlugs = new Set<string>(remoteBookPdfSlugs());
  try {
    const files = await readdir(pdfContentRoot());
    for (const f of files) {
      if (f.endsWith('.pdf')) pdfSlugs.add(f.replace(/\.pdf$/i, ''));
    }
  } catch {
    /* remote-only is fine */
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
