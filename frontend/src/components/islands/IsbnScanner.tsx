import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { Button } from '../ui/Button';
import Island from './Island';

const isbnSchema = z.object({
  isbn: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  pageCount: z.number().nullable(),
  publishedYear: z.number().nullable(),
  source: z.string(),
});

function ScannerInner() {
  const host = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [book, setBook] = useState<z.infer<typeof isbnSchema> | null>(null);
  const [manual, setManual] = useState('');

  useEffect(() => {
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let cancelled = false;

    async function start() {
      if (!host.current) return;
      const { Html5Qrcode } = await import('html5-qrcode');
      if (cancelled) return;
      const inst = new Html5Qrcode(host.current.id);
      scanner = inst;
      await inst.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 260, height: 140 } },
        async (decoded) => {
          if (busy) return;
          setBusy(true);
          try {
            await inst.stop();
            const digits = decoded.replace(/[-\s]/g, '');
            const data = await apiFetch(`/isbn/${encodeURIComponent(digits)}`, isbnSchema);
            setBook(data);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Lookup failed');
            setBusy(false);
          }
        },
        () => undefined,
      );
    }

    void start().catch((e) => {
      setError(e instanceof Error ? e.message : 'Camera unavailable — use manual ISBN');
    });

    return () => {
      cancelled = true;
      void scanner?.stop().catch(() => undefined);
      try {
        scanner?.clear();
      } catch {
        /* ignore */
      }
    };
  }, [busy]);

  async function lookupManual() {
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch(
        `/isbn/${encodeURIComponent(manual.replace(/[-\s]/g, ''))}`,
        isbnSchema,
      );
      setBook(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!book ? (
        <>
          <div
            id="isbn-scanner-host"
            ref={host}
            className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-ink-900"
          />
          {error ? <p className="text-sm text-urgent-600">{error}</p> : null}
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border border-line px-3 py-2 text-sm"
              placeholder="Or type ISBN"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <Button
              type="button"
              disabled={busy || manual.length < 10}
              onClick={() => void lookupManual()}
            >
              Lookup
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <p className="text-xs text-ink-500">Source: {book.source}</p>
          <h2 className="text-lg font-bold text-ink-900">{book.title}</h2>
          <p className="text-sm text-ink-500">{book.authors.join(', ') || 'Unknown author'}</p>
          <p className="text-sm text-ink-700">ISBN {book.isbn}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`/sell/used?isbn=${encodeURIComponent(book.isbn)}`}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-card)] bg-cta-500 px-4 text-sm font-semibold text-ink-900"
            >
              Confirm & list
            </a>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setBook(null);
                setBusy(false);
              }}
            >
              Scan again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IsbnScanner() {
  return (
    <Island>
      <ScannerInner />
    </Island>
  );
}
