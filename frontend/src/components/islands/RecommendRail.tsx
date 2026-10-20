import { useEffect, useState } from 'react';
import { fetchRecommendations } from '../../lib/discoverApi';
import { WhyThisBook } from '../ui/WhyThisBook';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';

type Section = {
  key: string;
  title: string;
  items: Array<{
    id: string;
    slug: string;
    titleBn: string;
    author: string;
    minPrice: string | null;
    why?: string;
  }>;
};

/**
 * Compact equal cards (fixed width, auto-fill). No stretch-to-full-row.
 * Long titles clamp; height matches within each row.
 */
const CARD_GRID =
  'mt-4 m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(9.75rem,9.75rem))] justify-start gap-3 p-0 min-[480px]:grid-cols-[repeat(auto-fill,minmax(10.5rem,10.5rem))] min-[900px]:grid-cols-[repeat(auto-fill,minmax(11rem,11rem))]';

export default function RecommendRail() {
  const [sections, setSections] = useState<Section[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  const load = () => {
    setStatus('loading');
    void fetchRecommendations()
      .then((data) => {
        setSections(data.sections);
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(() => {
    load();
  }, []);

  if (status === 'loading') {
    return (
      <div className="grid gap-3" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <div className={CARD_GRID}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }
  if (status === 'error') {
    return <ErrorState message="Could not load recommendations" onRetry={load} />;
  }
  if (sections.length === 0) return null;

  return (
    <div className="grid min-w-0 max-w-full gap-8">
      {sections.map((sec) => (
        <section key={sec.key} className="min-w-0 max-w-full" aria-labelledby={`rec-${sec.key}`}>
          <h2 id={`rec-${sec.key}`} className="m-0 font-display text-xl font-bold text-ink-900">
            {sec.title}
          </h2>
          <ul className={CARD_GRID}>
            {sec.items.map((b) => (
              <li key={b.id} className="min-w-0">
                <a
                  href={`/books/${b.slug}`}
                  className="flex h-full min-h-[7.25rem] flex-col rounded-[var(--radius-card)] border border-line bg-paper p-3 no-underline shadow-[var(--shadow-warm)] hover:border-brand-600"
                >
                  <p
                    className="m-0 line-clamp-2 min-h-[2.5rem] font-display text-sm leading-snug font-bold text-ink-900"
                    title={b.titleBn}
                  >
                    {b.titleBn}
                  </p>
                  <p className="m-0 mt-1 truncate text-xs text-ink-500" title={b.author}>
                    {b.author}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-2.5">
                    {b.minPrice ? (
                      <span className="text-xs font-semibold text-ink-900">৳{b.minPrice}</span>
                    ) : null}
                    {b.why ? <WhyThisBook why={b.why} /> : null}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
