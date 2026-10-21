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

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4] as const;
const MIN_ZOOM = ZOOM_STEPS[0];
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];

function nearestZoom(scale: number): number {
  return ZOOM_STEPS.reduce((best, step) =>
    Math.abs(step - scale) < Math.abs(best - scale) ? step : best,
  );
}

function isNarrowViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

function PdfBookReaderInner({ slug, title }: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PdfDoc | null>(null);
  const renderToken = useRef(0);
  const wheelLockUntil = useRef(0);
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<'width' | 'page' | 'manual'>(() =>
    isNarrowViewport() ? 'width' : 'page',
  );
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageInput, setPageInput] = useState('1');
  const [canPan, setCanPan] = useState(false);

  const paintPage = useEffectEvent(async (pageNum: number, scale: number, rot: number) => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!doc || !canvas) return;
    const token = ++renderToken.current;
    const pdfPage = await doc.getPage(pageNum);
    if (token !== renderToken.current) return;

    let finalScale = scale;
    if (fitMode === 'width' && stage) {
      const base = pdfPage.getViewport({ scale: 1, rotation: rot });
      finalScale = Math.max(MIN_ZOOM, (stage.clientWidth - 16) / base.width);
    } else if (fitMode === 'page' && stage) {
      const base = pdfPage.getViewport({ scale: 1, rotation: rot });
      const sx = (stage.clientWidth - 16) / base.width;
      const sy = (stage.clientHeight - 16) / base.height;
      finalScale = Math.max(MIN_ZOOM, Math.min(sx, sy));
    }

    const viewport = pdfPage.getViewport({ scale: finalScale, rotation: rot });
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cap DPR when heavily zoomed so mobile memory stays sane; still crisp enough to read.
    const dprCap = finalScale >= 2.5 ? 1.25 : finalScale >= 1.75 ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    // True display size (no shrink-back). Zoomed pages pan inside the stage.
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
    if (token !== renderToken.current) return;
    if (fitMode !== 'manual') setZoom(nearestZoom(finalScale));

    if (stage) {
      const pan =
        viewport.width > stage.clientWidth + 2 || viewport.height > stage.clientHeight + 2;
      setCanPan(pan);
      if (fitMode !== 'manual') {
        stage.scrollTop = 0;
        stage.scrollLeft = 0;
      }
    }
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
    const stage = stageRef.current;
    if (stage && status === 'ok') {
      stage.scrollTop = 0;
      stage.scrollLeft = 0;
    }
  }, [page, status]);

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

  /** Wheel: pan when zoomed; at edge (or fit) flip page. */
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || status !== 'ok') return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const stage = stageRef.current;
      const dy = e.deltaY;
      const dx = e.deltaX;
      if (stage) {
        const maxY = stage.scrollHeight - stage.clientHeight;
        const maxX = stage.scrollWidth - stage.clientWidth;
        const canY = maxY > 2;
        const canX = maxX > 2;
        if (canY || canX) {
          const atBottom = stage.scrollTop >= maxY - 2;
          const atTop = stage.scrollTop <= 2;
          const primary = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
          if (canY && Math.abs(dy) >= Math.abs(dx)) {
            if (dy > 0 && !atBottom) {
              stage.scrollTop = Math.min(maxY, stage.scrollTop + dy);
              return;
            }
            if (dy < 0 && !atTop) {
              stage.scrollTop = Math.max(0, stage.scrollTop + dy);
              return;
            }
          } else if (canX) {
            const atRight = stage.scrollLeft >= maxX - 2;
            const atLeft = stage.scrollLeft <= 2;
            if (primary > 0 && !atRight) {
              stage.scrollLeft = Math.min(maxX, stage.scrollLeft + primary);
              return;
            }
            if (primary < 0 && !atLeft) {
              stage.scrollLeft = Math.max(0, stage.scrollLeft + primary);
              return;
            }
          }
        }
      }

      const now = Date.now();
      if (now < wheelLockUntil.current) return;
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
      wheelLockUntil.current = now + 280;
      const delta = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
      if (delta > 0) goNext();
      else if (delta < 0) goPrev();
    };

    shell.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => shell.removeEventListener('wheel', onWheel, { capture: true });
  }, [status, goNext, goPrev]);

  /** Touch: pinch zoom, swipe page when not panning a zoomed page. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || status !== 'ok') return;

    const dist = (a: Touch, b: Touch) => {
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      return Math.hypot(dx, dy);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStart.current = { dist: dist(e.touches[0], e.touches[1]), zoom };
        touchStart.current = null;
        return;
      }
      if (e.touches.length === 1) {
        touchStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          t: Date.now(),
        };
      }
    };

    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStart.current) {
        e.preventDefault();
        const ratio = dist(e.touches[0], e.touches[1]) / pinchStart.current.dist;
        const next = nearestZoom(pinchStart.current.zoom * ratio);
        setFitMode('manual');
        setZoom(next);
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (pinchStart.current && e.touches.length < 2) {
        pinchStart.current = null;
        return;
      }
      const start = touchStart.current;
      touchStart.current = null;
      if (!start || e.changedTouches.length === 0) return;

      const maxY = stage.scrollHeight - stage.clientHeight;
      const maxX = stage.scrollWidth - stage.clientWidth;
      const panning = maxY > 2 || maxX > 2;
      if (panning) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const dt = Date.now() - start.t;
      if (dt > 500) return;
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (dx < 0) goNext();
      else goPrev();
    };

    stage.addEventListener('touchstart', onStart, { passive: true });
    stage.addEventListener('touchmove', onMove, { passive: false });
    stage.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      stage.removeEventListener('touchstart', onStart);
      stage.removeEventListener('touchmove', onMove);
      stage.removeEventListener('touchend', onEnd);
    };
  }, [status, zoom, goNext, goPrev]);

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
    'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-line bg-paper px-2 text-sm font-semibold text-ink-900 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40';
  const btnActive = 'border-brand-600 bg-brand-50 text-brand-700';
  const btnSm = `${btn} px-2.5`;

  return (
    <div
      ref={shellRef}
      className={`flex flex-col overflow-hidden overscroll-none rounded-(--radius-card) border border-line bg-sand shadow-(--shadow-warm) ${
        isFullscreen
          ? 'h-dvh rounded-none border-0'
          : 'h-[calc(100dvh-8.5rem)] max-h-[calc(100dvh-8.5rem)] tab:h-[calc(100dvh-11rem)] tab:max-h-[calc(100dvh-11rem)]'
      }`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex flex-col gap-2 border-b border-line bg-paper px-2 py-2 tab:px-3">
        <div className="flex flex-wrap items-center gap-1.5 tab:gap-2">
          <a href={`/books/${slug}`} className={`${btn} no-underline`} title="Back to book">
            ← Book
          </a>

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
              className="min-h-11 w-12 rounded-lg border border-line bg-cream px-1.5 text-center text-sm text-ink-900 tab:w-14 tab:px-2"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={jumpToPage}
              onKeyDown={(e) => {
                if (e.key === 'Enter') jumpToPage();
              }}
              inputMode="numeric"
              aria-label="Page number"
            />
            <span className="text-ink-500">/ {pageCount || '…'}</span>
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

          <span className="mx-0.5 hidden h-6 w-px bg-line tab:inline-block" aria-hidden />

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
            className="min-w-12 text-center text-sm font-semibold text-ink-700 tab:min-w-14"
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
            className={`${btnSm} ${fitMode === 'width' ? btnActive : ''}`}
            onClick={() => setFitMode('width')}
            title="Fit width: best for phones"
          >
            Width
          </button>
          <button
            type="button"
            className={`${btnSm} ${fitMode === 'page' ? btnActive : ''}`}
            onClick={() => setFitMode('page')}
            title="Fit whole page"
          >
            Page
          </button>
          <button
            type="button"
            className={`${btn} hidden tab:inline-flex`}
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
            className={btnSm}
            onClick={() => void toggleFullscreen()}
            aria-label="Fullscreen"
          >
            {isFullscreen ? 'Exit' : 'Full'}
          </button>
        </div>
        <p className="m-0 text-[11px] leading-snug text-ink-500 tab:text-xs">
          {canPan
            ? 'Zoomed: drag to move · scroll edge / swipe changes page · pinch to zoom'
            : 'Scroll or swipe: next page · Width + zoom for clear reading on phone'}
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
          PDF not found for this book.
        </div>
      )}

      {status === 'ok' ? (
        <div
          ref={stageRef}
          className={`bv-pdf-stage min-h-0 flex-1 overscroll-none bg-ink-900/90 p-2 tab:p-3 ${
            canPan
              ? 'overflow-auto touch-pan-x touch-pan-y'
              : 'flex items-center justify-center overflow-hidden'
          }`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <canvas
            ref={canvasRef}
            className={`bg-paper shadow-(--shadow-warm) ${canPan ? 'mx-auto block' : ''}`}
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
