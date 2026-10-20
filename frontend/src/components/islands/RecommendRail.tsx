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
      <div className="grid gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28" />
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
          <ul className="mt-4 flex max-w-full list-none gap-3 overflow-x-auto p-0 pb-2">
            {sec.items.map((b) => (
              <li key={b.id} className="w-48 shrink-0">
                <a
                  href={`/books/${b.slug}`}
                  className="block rounded-[var(--radius-card)] border border-line bg-paper p-3 no-underline hover:bg-sand"
                >
                  <p className="m-0 font-display text-sm font-bold text-ink-900">{b.titleBn}</p>
                  <p className="m-0 mt-1 text-xs text-ink-500">{b.author}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {b.minPrice && (
                      <span className="text-xs font-semibold text-ink-900">৳{b.minPrice}</span>
                    )}
                    {b.why && <WhyThisBook why={b.why} />}
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
