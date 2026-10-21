import { useEffect, useEffectEvent, useRef, useState } from 'react';
import Island from './Island';

type Props = {
  slug: string;
  title: string;
};

type PdfPage = {
  getViewport: (opts: { scale: number; rotation?: number }) => { width: number; height: number };
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    canvas: HTMLCanvasElement;
  }) => { promise: Promise<void> };
};

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
};

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;
const MIN_ZOOM = ZOOM_STEPS[0];
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];

function nearestZoom(scale: number): number {
  return ZOOM_STEPS.reduce((best, step) =>
    Math.abs(step - scale) < Math.abs(best - scale) ? step : best,
  );
}

function PdfBookReaderInner({ slug, title }: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PdfDoc | null>(null);
  const renderToken = useRef(0);

  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<'width' | 'page' | 'manual'>('width');
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageInput, setPageInput] = useState('1');

  const paintPage = useEffectEvent(async (pageNum: number, scale: number, rot: number) => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    const token = ++renderToken.current;
    const pdfPage = await doc.getPage(pageNum);
    if (token !== renderToken.current) return;

    let finalScale = scale;
    const scroll = scrollRef.current;
    if (fitMode === 'width' && scroll) {
      const base = pdfPage.getViewport({ scale: 1, rotation: rot });
      finalScale = Math.max(MIN_ZOOM, (scroll.clientWidth - 24) / base.width);
    } else if (fitMode === 'page' && scroll) {
      const base = pdfPage.getViewport({ scale: 1, rotation: rot });
      const sx = (scroll.clientWidth - 24) / base.width;
      const sy = (scroll.clientHeight - 24) / base.height;
      finalScale = Math.max(MIN_ZOOM, Math.min(sx, sy));
    }

    const viewport = pdfPage.getViewport({ scale: finalScale, rotation: rot });
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
    if (token !== renderToken.current) return;
    if (fitMode !== 'manual') setZoom(nearestZoom(finalScale));
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setStatus('loading');
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();

        const res = await fetch(`/api/book-pdf/${encodeURIComponent(slug)}`, {
          headers: { Accept: 'application/pdf' },
          credentials: 'same-origin',
        });
        if (!res.ok) throw new Error('missing');
        const data = new Uint8Array(await res.arrayBuffer());
        if (cancelled) return;
        if (docRef.current) {
          await docRef.current.destroy().catch(() => undefined);
          docRef.current = null;
        }
        const doc = (await pdfjs.getDocument({ data }).promise) as unknown as PdfDoc;
        if (cancelled) {
          await doc.destroy().catch(() => undefined);
          return;
        }
        docRef.current = doc;
        setPageCount(doc.numPages);
        setPage(1);
        setPageInput('1');
        setStatus('ok');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    void run();
    return () => {
      cancelled = true;
      renderToken.current += 1;
      const doc = docRef.current;
      docRef.current = null;
      void doc?.destroy().catch(() => undefined);
    };
  }, [slug]);

  useEffect(() => {
    if (status !== 'ok') return;
    void paintPage(page, zoom, rotation);
  }, [status, page, zoom, rotation, fitMode, paintPage]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (status === 'ok' && fitMode !== 'manual') void paintPage(page, zoom, rotation);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [status, fitMode, page, zoom, rotation, paintPage]);

  const goPrev = useEffectEvent(() => {
    setPage((p) => {
      const next = Math.max(1, p - 1);
      setPageInput(String(next));
      return next;
    });
  });

  const goNext = useEffectEvent(() => {
    setPage((p) => {
      const next = Math.min(pageCount || p, p + 1);
      setPageInput(String(next));
      return next;
    });
  });

  const zoomIn = useEffectEvent(() => {
    setFitMode('manual');
    setZoom((z) => ZOOM_STEPS.find((s) => s > z + 0.001) ?? MAX_ZOOM);
  });

  const zoomOut = useEffectEvent(() => {
    setFitMode('manual');
    setZoom((z) => [...ZOOM_STEPS].reverse().find((s) => s < z - 0.001) ?? MIN_ZOOM);
  });

  const toggleFullscreen = useEffectEvent(async () => {
    const el = shellRef.current;
    if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen().catch(() => undefined);
    else await document.exitFullscreen().catch(() => undefined);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        void toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, zoomIn, zoomOut, toggleFullscreen]);

  const jumpToPage = () => {
    const n = Number.parseInt(pageInput, 10);
    if (!Number.isFinite(n)) {
      setPageInput(String(page));
      return;
    }
    const clamped = Math.min(pageCount || 1, Math.max(1, n));
    setPage(clamped);
    setPageInput(String(clamped));
  };

  const btn =
    'inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-line bg-paper px-2.5 text-sm font-semibold text-ink-900 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40';
  const btnActive = 'border-brand-600 bg-brand-50 text-brand-700';

  return (
    <div
      ref={shellRef}
      className={`flex flex-col overflow-hidden rounded-(--radius-card) border border-line bg-sand shadow-(--shadow-warm) ${
        isFullscreen ? 'h-dvh rounded-none border-0' : 'min-h-[70vh]'
      }`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper px-3 py-2">
        <a href={`/books/${slug}`} className={`${btn} no-underline`} title="Back to book">
          ← Book
        </a>

        <div className="mx-1 hidden h-6 w-px bg-line tab:block" aria-hidden />

        <button
          type="button"
          className={btn}
          onClick={goPrev}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          ‹
        </button>
        <label className="flex items-center gap-1 text-sm text-ink-700">
          <span className="sr-only">Page</span>
          <input
            className="min-h-10 w-14 rounded-lg border border-line bg-cream px-2 text-center text-sm text-ink-900"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={jumpToPage}
            onKeyDown={(e) => {
              if (e.key === 'Enter') jumpToPage();
            }}
            inputMode="numeric"
            aria-label="Page number"
          />
          <span className="text-ink-500">/ {pageCount || '—'}</span>
        </label>
        <button
          type="button"
          className={btn}
          onClick={goNext}
          disabled={!pageCount || page >= pageCount}
          aria-label="Next page"
        >
          ›
        </button>

        <div className="mx-1 hidden h-6 w-px bg-line tab:block" aria-hidden />

        <button
          type="button"
          className={btn}
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
        >
          −
        </button>
        <span
          className="min-w-14 text-center text-sm font-semibold text-ink-700"
          aria-live="polite"
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className={btn}
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className={`${btn} ${fitMode === 'width' ? btnActive : ''}`}
          onClick={() => setFitMode('width')}
        >
          Fit width
        </button>
        <button
          type="button"
          className={`${btn} ${fitMode === 'page' ? btnActive : ''}`}
          onClick={() => setFitMode('page')}
        >
          Fit page
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            setFitMode('manual');
            setRotation((r) => (r + 90) % 360);
          }}
          aria-label="Rotate"
        >
          ↻
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => void toggleFullscreen()}
          aria-label="Fullscreen"
        >
          {isFullscreen ? 'Exit full' : 'Fullscreen'}
        </button>

        <p className="m-0 ml-auto hidden text-xs text-ink-500 lap:block">
          ← → pages · ± zoom · F fullscreen · no download
        </p>
      </div>

      {status === 'loading' && (
        <div className="flex flex-1 items-center justify-center py-24 text-ink-500">
          Loading pages…
        </div>
      )}

      {status === 'error' && (
        <div
          className="m-4 rounded-(--radius-card) border border-urgent-600/30 bg-urgent-50 p-4 text-urgent-600"
          role="alert"
        >
          PDF not found. Add <code className="font-mono text-xs">content/pdfs/{slug}.pdf</code>
        </div>
      )}

      {status === 'ok' ? (
        <div
          ref={scrollRef}
          className={`flex flex-1 justify-center overflow-auto bg-ink-900/90 p-3 ${isFullscreen ? 'min-h-0' : 'min-h-[60vh]'}`}
        >
          <canvas
            ref={canvasRef}
            className="max-w-none bg-paper shadow-(--shadow-warm)"
            role="img"
            aria-label={`${title}, page ${page} of ${pageCount}`}
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
