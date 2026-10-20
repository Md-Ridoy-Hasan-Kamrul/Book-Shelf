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
 * Each card: w-max from its own content (long title → only that card wider).
 * Same row height via items-stretch. Wrap; no forced equal columns, no x-scroll.
 */
const CARD_ROW = 'mt-4 m-0 flex list-none flex-wrap items-stretch gap-3 p-0';

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
        <div className={CARD_ROW}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-40" />
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
          <ul className={CARD_ROW}>
            {sec.items.map((b) => (
              <li key={b.id} className="w-max max-w-full">
                <a
                  href={`/books/${b.slug}`}
                  className="flex h-full min-h-[7rem] w-max max-w-full flex-col rounded-[var(--radius-card)] border border-line bg-paper p-3 no-underline hover:bg-sand"
                >
                  <p className="m-0 w-max max-w-[min(100%,22rem)] font-display text-sm leading-snug font-bold text-ink-900">
                    {b.titleBn}
                  </p>
                  <p className="m-0 mt-1 w-max max-w-[min(100%,22rem)] text-xs text-ink-500">
                    {b.author}
                  </p>
                  <div className="mt-auto flex w-max max-w-[min(100%,22rem)] flex-wrap items-center gap-2 pt-3">
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
