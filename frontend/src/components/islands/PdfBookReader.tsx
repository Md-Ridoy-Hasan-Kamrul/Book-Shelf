import { useEffect, useRef, useState } from 'react';
import Island from './Island';

type Props = {
  slug: string;
  title: string;
};

function PdfBookReaderInner({ slug, title }: Props) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setStatus('loading');
      try {
        const res = await fetch(`/api/book-pdf/${encodeURIComponent(slug)}`, {
          headers: { Accept: 'application/pdf' },
          credentials: 'same-origin',
        });
        if (!res.ok) throw new Error('missing');
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const blob = new Blob([buf], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = url;
        // Hide Chrome PDF chrome (download / print) when supported.
        setPageUrl(`${url}#toolbar=0&navpanes=0&scrollbar=1`);
        setStatus('ok');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    void run();
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [slug]);

  useEffect(() => {
    const blockSave = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', blockSave);
    return () => window.removeEventListener('keydown', blockSave);
  }, []);

  return (
    <div className="flex min-h-[70vh] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-ink-500">
          Online read only · download is disabled for this sample.
        </p>
        <a
          href={`/books/${slug}`}
          className="text-sm font-semibold text-brand-700 no-underline hover:underline"
        >
          Back to book
        </a>
      </div>

      {status === 'loading' && (
        <div className="flex min-h-[60vh] items-center justify-center rounded-(--radius-card) border border-line bg-sand text-ink-500">
          Loading pages…
        </div>
      )}

      {status === 'error' && (
        <div
          className="rounded-(--radius-card) border border-urgent-600/30 bg-urgent-50 p-4 text-urgent-600"
          role="alert"
        >
          PDF not found for this book. Add{' '}
          <code className="font-mono text-xs">content/pdfs/{slug}.pdf</code> and refresh.
        </div>
      )}

      {status === 'ok' && pageUrl ? (
        <div
          className="overflow-hidden rounded-(--radius-card) border border-line bg-ink-900 shadow-(--shadow-warm)"
          onContextMenu={(e) => e.preventDefault()}
        >
          <iframe
            title={`Read: ${title}`}
            src={pageUrl}
            className="h-[min(80vh,56rem)] w-full border-0 bg-sand"
            // Intentionally no download / save affordance in our UI.
          />
        </div>
      ) : null}
    </div>
  );
}

export default function PdfBookReader(props: Props) {
  return (
    <Island>
      <PdfBookReaderInner {...props} />
    </Island>
  );
}
