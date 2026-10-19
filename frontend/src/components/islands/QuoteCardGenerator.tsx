import { useRef, useState, useTransition } from 'react';
import { toPng } from 'html-to-image';

type Format = 'story' | 'square';

type Props = {
  title: string;
  author: string;
  initialQuote?: string;
};

const SIZES: Record<Format, { w: number; h: number; label: string }> = {
  story: { w: 1080, h: 1920, label: '1080×1920 Story' },
  square: { w: 1080, h: 1080, label: '1080×1080 Square' },
};

/**
 * Client-side only (html-to-image). Uses Hind Siliguri so Bangla conjuncts
 * shape in the browser — do not use server Satori without proving Bangla.
 */
export default function QuoteCardGenerator({ title, author, initialQuote = '' }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [quote, setQuote] = useState(initialQuote);
  const [format, setFormat] = useState<Format>('square');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const size = SIZES[format];

  const download = () => {
    const node = cardRef.current;
    if (!node || quote.trim().length < 1) return;
    startTransition(() => {
      void (async () => {
        setError(null);
        try {
          // Scale from preview (360 CSS px) to export pixels
          const scale = size.w / 360;
          const dataUrl = await toPng(node, {
            width: size.w,
            height: size.h,
            pixelRatio: 1,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: '360px',
              height: `${(size.h / size.w) * 360}px`,
            },
            // Prefer webfonts already loaded (Hind Siliguri)
            cacheBust: true,
          });
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `bookverse-quote-${format}.png`;
          a.click();
        } catch {
          setError('Could not render card — try again after fonts load');
        }
      })();
    });
  };

  const previewH = (size.h / size.w) * 360;

  return (
    <section aria-labelledby="quote-card-title" className="mt-8">
      <h2 id="quote-card-title" className="m-0 font-display text-xl font-bold text-ink-900">
        Quote card
      </h2>
      <p className="mt-1 text-sm text-ink-500">
        Short quote only · Bangla conjuncts via browser fonts (client html-to-image)
      </p>

      <label className="mt-3 block text-sm font-semibold text-ink-900" htmlFor="quote-text">
        Your quote
      </label>
      <textarea
        id="quote-text"
        maxLength={280}
        rows={3}
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        className="mt-1 w-full rounded-[var(--radius-card)] border border-line bg-paper px-3 py-2 font-[family-name:var(--font-bangla,Hind_Siliguri),Inter,sans-serif] text-sm text-ink-900"
        placeholder="একটি ছোট উদ্ধৃতি…"
        lang="bn"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(SIZES) as Format[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              format === f ? 'bg-brand-600 text-paper' : 'border border-line bg-paper text-ink-700'
            }`}
          >
            {SIZES[f].label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-auto">
        <div
          ref={cardRef}
          style={{ width: 360, height: previewH }}
          className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-cream p-6 text-ink-900 shadow-[var(--shadow-warm)]"
          lang="bn"
        >
          <p
            className="m-0 text-lg leading-relaxed font-semibold"
            style={{ fontFamily: '"Hind Siliguri", Inter, sans-serif' }}
          >
            “{quote || '…'}”
          </p>
          <div>
            <p
              className="m-0 text-sm font-bold"
              style={{ fontFamily: '"Hind Siliguri", Inter, sans-serif' }}
            >
              {title}
            </p>
            <p className="m-0 mt-0.5 text-xs text-ink-500">{author}</p>
            <p className="m-0 mt-3 text-[10px] font-bold tracking-widest text-brand-600 uppercase">
              BookVerse
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={pending || quote.trim().length < 1}
        onClick={download}
        className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-card)] bg-cta-500 px-4 text-sm font-semibold text-ink-900 disabled:opacity-60"
      >
        {pending ? 'Rendering…' : 'Download PNG'}
      </button>
      {error && <p className="mt-2 text-sm text-urgent-600">{error}</p>}
    </section>
  );
}
