import { useEffect, useState, useTransition } from 'react';
import type { MoodEnum } from '@bookverse/shared';
import { fetchMoodBooks } from '../../lib/discoverApi';
import { WhyThisBook } from '../ui/WhyThisBook';
import { MoodChip } from '../ui/MoodChip';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';

type BookItem = {
  id: string;
  slug: string;
  title: string;
  titleBn: string;
  author: string;
  minPrice: string | null;
  moodTags: string[];
  pageCount: number | null;
  why?: string;
};

type Props = {
  initialMood: MoodEnum;
};

export default function MoodResults({ initialMood }: Props) {
  const [mood] = useState(initialMood);
  const [items, setItems] = useState<BookItem[]>([]);
  const [disclaimer, setDisclaimer] = useState('these books may match your mood');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minPages, setMinPages] = useState('');
  const [maxPages, setMaxPages] = useState('');
  const [sort, setSort] = useState('popularity');
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(() => {
      void (async () => {
        setStatus('loading');
        try {
          const data = await fetchMoodBooks({
            mood,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
            minPages: minPages ? Number(minPages) : undefined,
            maxPages: maxPages ? Number(maxPages) : undefined,
            sort,
          });
          setDisclaimer(data.disclaimer);
          setItems(data.items);
          setStatus('ok');
        } catch {
          setStatus('error');
        }
      })();
    });
  };

  useEffect(() => {
    load();
  }, [mood]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <MoodChip mood={mood} label={mood} />
        <p className="m-0 text-sm text-ink-500">{disclaimer}</p>
      </div>

      <form
        className="mt-6 grid gap-3 min-[720px]:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          type="number"
          min={0}
          placeholder="Min ৳"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="rounded-(--radius-card) border border-line bg-paper px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          placeholder="Max ৳"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="rounded-(--radius-card) border border-line bg-paper px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={1}
          placeholder="Min pages"
          value={minPages}
          onChange={(e) => setMinPages(e.target.value)}
          className="rounded-(--radius-card) border border-line bg-paper px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={1}
          placeholder="Max pages"
          value={maxPages}
          onChange={(e) => setMaxPages(e.target.value)}
          className="rounded-(--radius-card) border border-line bg-paper px-3 py-2 text-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-(--radius-card) border border-line bg-paper px-3 py-2 text-sm"
        >
          <option value="popularity">Popularity</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-paper min-[720px]:col-span-5"
        >
          Apply filters
        </button>
      </form>

      {status === 'loading' && (
        <div className="mt-8 grid gap-4 min-[720px]:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      )}
      {status === 'error' && (
        <div className="mt-8">
          <ErrorState message="Could not load mood results" onRetry={load} />
        </div>
      )}
      {status === 'ok' && items.length === 0 && (
        <div className="mt-8">
          <EmptyState title="No in-stock matches">Try another mood or loosen filters.</EmptyState>
        </div>
      )}

      {status === 'ok' && items.length > 0 && (
        <ul className="mt-8 grid list-none gap-4 p-0 min-[720px]:grid-cols-3">
          {items.map((b) => (
            <li key={b.id}>
              <a
                href={`/books/${b.slug}`}
                className="block rounded-(--radius-card) border border-line bg-paper p-4 no-underline hover:bg-sand"
              >
                <h2 className="m-0 font-display text-lg font-bold text-ink-900">{b.titleBn}</h2>
                <p className="m-0 mt-1 text-sm text-ink-500">{b.author}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {b.minPrice && (
                    <span className="text-sm font-semibold text-ink-900">৳{b.minPrice}</span>
                  )}
                  {b.pageCount != null && (
                    <span className="text-xs text-ink-500">{b.pageCount} pages</span>
                  )}
                  {b.why && <WhyThisBook why={b.why} />}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
