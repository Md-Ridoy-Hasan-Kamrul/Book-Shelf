import type { APIRoute } from 'astro';
import { pdfReadOnlyHeaders, readBookPdf } from '../../../lib/bookPdf';

export const prerender = false;

/** Streams PDF for in-app reading only (no attachment / public static URL). */
export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug?.trim() ?? '';
  const file = await readBookPdf(slug);
  if (!file) {
    return new Response(
      JSON.stringify({ success: false, code: 'NOT_FOUND', message: 'PDF not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  return new Response(new Uint8Array(file.data), {
    status: 200,
    headers: pdfReadOnlyHeaders(file.filename, file.data.byteLength),
  });
};
