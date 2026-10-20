import { useEffect, useState } from 'react';
import { bookCardSchema } from '@bookverse/shared';
import { z } from 'zod';
import { fetchBooks } from '../../lib/catalogApi';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { Price } from '../ui/Price';
import { Badge } from '../ui/Badge';

type BookCard = z.infer<typeof bookCardSchema>;

export default function HomeBrowseStrip() {
  const [items, setItems] = useState<BookCard[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  const load = () => {
    setStatus('loading');
    void fetchBooks({ limit: '8', sort: 'newest' })
      .then((data) => {
        setItems(data.items);
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="py-10" aria-labelledby="browse-heading">
      <div className="bv-container">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="browse-heading" className="type-page m-0 text-ink-900">
              নতুন বই
            </h2>
            <p className="type-ui m-0 mt-1 text-ink-500">ক্যাটালগ থেকে সাম্প্রতিক যোগ</p>
          </div>
          <a
            href="/search"
            className="text-sm font-semibold text-brand-600 no-underline hover:text-brand-700"
          >
            সব দেখুন
          </a>
        </div>

        {status === 'loading' ? (
          <div
            className="grid gap-4 min-[520px]:grid-cols-2 min-[900px]:grid-cols-4"
            aria-busy="true"
          >
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : null}

        {status === 'error' ? <ErrorState message="বই লোড করা যায়নি" onRetry={load} /> : null}

        {status === 'ok' && items.length === 0 ? (
          <EmptyState title="এখনো বই নেই">সিড চালান বা সেলার হিসেবে বই যোগ করুন।</EmptyState>
        ) : null}

        {status === 'ok' && items.length > 0 ? (
          <ul className="m-0 grid list-none gap-4 p-0 min-[520px]:grid-cols-2 min-[900px]:grid-cols-4">
            {items.map((b) => (
              <li key={b.id}>
                <a
                  href={`/books/${b.slug}`}
                  className="block h-full rounded-[var(--radius-card)] border border-line bg-paper p-4 no-underline shadow-[var(--shadow-warm)] hover:border-brand-600"
                >
                  <div
                    className="mb-3 aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] bg-sand"
                    aria-hidden
                  >
                    {b.coverUrl ? (
                      <img src={b.coverUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <h3 className="m-0 font-display text-base font-bold text-ink-900">{b.titleBn}</h3>
                  <p className="m-0 mt-1 text-sm text-ink-500">{b.author}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {b.minPrice ? <Price amount={Number(b.minPrice)} /> : null}
                    {b.hasStock ? (
                      <Badge tone="leaf">স্টক আছে</Badge>
                    ) : (
                      <Badge tone="urgent">শেষ</Badge>
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
