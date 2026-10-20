import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { fetchOrders } from '../../lib/checkoutApi';
import { fh } from '../../lib/freshHuman';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import Island from './Island';

type Props = {
  name: string;
  usedBooks: boolean;
};

const shelfItemSchema = z.object({
  id: z.string(),
  pageProgress: z.number(),
  pageCount: z.number().nullable(),
  book: z.object({
    slug: z.string(),
    title: z.string(),
    author: z.string(),
  }),
});

const shelfSchema = z.object({
  columns: z.record(z.string(), z.array(shelfItemSchema)),
});

const pointsSchema = z.object({
  pointsBalance: z.number().optional(),
  balance: z.number().optional(),
});

const ACTIVE = new Set([
  'PLACED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'IN_TRANSIT',
]);

function ReaderHomeInner({ name, usedBooks }: Props) {
  const first = name.trim().split(/\s+/)[0] || 'Reader';

  const orders = useQuery({ queryKey: ['reader-home', 'orders'], queryFn: fetchOrders });
  const shelf = useQuery({
    queryKey: ['reader-home', 'shelf'],
    queryFn: () => apiFetch('/bookshelf', shelfSchema),
  });
  const points = useQuery({
    queryKey: ['reader-home', 'points'],
    queryFn: () => apiFetch('/bookshelf/points', pointsSchema),
  });

  const loading = orders.isLoading || shelf.isLoading || points.isLoading;
  const failed = orders.isError || shelf.isError || points.isError;

  if (loading) {
    return (
      <div className="grid gap-4" aria-busy="true">
        <Skeleton className="h-24" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (failed) {
    return (
      <ErrorState
        message="Could not load your home"
        onRetry={() => {
          void orders.refetch();
          void shelf.refetch();
          void points.refetch();
        }}
      />
    );
  }

  const activeOrders = (orders.data?.items ?? []).filter((o) => ACTIVE.has(o.status)).slice(0, 3);
  const reading = (shelf.data?.columns.CURRENTLY_READING ?? []).slice(0, 2);
  const pts = points.data?.pointsBalance ?? points.data?.balance ?? 0;

  return (
    <div className="grid min-w-0 gap-6">
      <header className={`${fh.cardBrand} p-4 min-[480px]:p-5`}>
        <p className="m-0 text-sm font-semibold text-brand-700">আপনার জন্য</p>
        <h1 className="m-0 mt-1 font-display text-2xl font-bold text-ink-900 min-[640px]:text-3xl">
          হ্যালো, {first}
        </h1>
        <p className="m-0 mt-1 text-sm text-ink-500">
          পড়া চালিয়ে যান, অর্ডার ট্র্যাক করুন, নতুন বই খুঁজুন।
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/mood" className={`${fh.btnCta} inline-flex no-underline`}>
            আজকের মুড
          </a>
          <a href="/bookshelf" className={`${fh.btnGhost} inline-flex no-underline`}>
            Bookshelf
          </a>
        </div>
      </header>

      <section aria-labelledby="home-orders">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 id="home-orders" className="m-0 font-display text-lg font-bold text-ink-900">
            চলমান অর্ডার
          </h2>
          <a
            href="/orders"
            className="text-sm font-semibold text-brand-700 no-underline hover:underline"
          >
            সব দেখুন
          </a>
        </div>
        {activeOrders.length === 0 ? (
          <div className={`${fh.card} p-4`}>
            <p className="m-0 text-sm text-ink-500">এখন কোনো চলমান অর্ডার নেই।</p>
            <a
              href="/search"
              className="mt-2 inline-block text-sm font-semibold text-brand-700 no-underline hover:underline"
            >
              বই খুঁজুন
            </a>
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {activeOrders.map((o) => (
              <li key={o.id}>
                <a
                  href={`/orders/${o.id}`}
                  className={`${fh.listRow} flex flex-wrap items-center justify-between gap-2 no-underline`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink-900">
                      {o.sellerName}
                    </span>
                    <span className="block text-xs text-ink-500">{o.status}</span>
                  </span>
                  <span className="text-sm font-semibold text-ink-900">৳{o.total}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="home-reading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 id="home-reading" className="m-0 font-display text-lg font-bold text-ink-900">
            এখন পড়ছি
          </h2>
          <a
            href="/bookshelf"
            className="text-sm font-semibold text-brand-700 no-underline hover:underline"
          >
            Shelf
          </a>
        </div>
        {reading.length === 0 ? (
          <div className={`${fh.card} p-4`}>
            <p className="m-0 text-sm text-ink-500">শেল্ফে চলমান বই নেই।</p>
            <a
              href="/bookshelf"
              className="mt-2 inline-block text-sm font-semibold text-brand-700 no-underline hover:underline"
            >
              বই যোগ করুন
            </a>
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0 min-[520px]:grid-cols-2">
            {reading.map((item) => {
              const max = item.pageCount && item.pageCount > 0 ? item.pageCount : 100;
              const pct = Math.min(100, Math.round((item.pageProgress / max) * 100));
              return (
                <li key={item.id}>
                  <a
                    href={`/books/${item.book.slug}`}
                    className={`${fh.cardLeaf} block no-underline hover:border-leaf-600`}
                  >
                    <p className="m-0 line-clamp-2 font-display text-sm font-bold text-ink-900">
                      {item.book.title}
                    </p>
                    <p className="m-0 mt-1 truncate text-xs text-ink-500">{item.book.author}</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-leaf-100">
                      <div
                        className="h-full rounded-full bg-leaf-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="m-0 mt-1 text-xs font-semibold text-leaf-700">{pct}%</p>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="home-quick" className="grid gap-3 min-[480px]:grid-cols-2">
        <div className={`${fh.card} p-4`}>
          <h2 id="home-quick" className="m-0 font-display text-base font-bold text-ink-900">
            পয়েন্ট
          </h2>
          <p className="m-0 mt-2 font-display text-2xl font-bold text-ink-900">{pts}</p>
          <a
            href="/points"
            className="mt-2 inline-block text-sm font-semibold text-brand-700 no-underline hover:underline"
          >
            ইতিহাস দেখুন
          </a>
        </div>
        <div className={`${fh.card} p-4`}>
          <p className="m-0 font-display text-base font-bold text-ink-900">দ্রুত লিংক</p>
          <ul className="m-0 mt-2 list-none space-y-1.5 p-0 text-sm font-semibold">
            <li>
              <a href="/orders" className="text-brand-700 no-underline hover:underline">
                Orders
              </a>
            </li>
            <li>
              <a href="/feed" className="text-brand-700 no-underline hover:underline">
                Community feed
              </a>
            </li>
            <li>
              <a href="/account" className="text-brand-700 no-underline hover:underline">
                Profile
              </a>
            </li>
            {usedBooks ? (
              <li>
                <a href="/sell/used" className="text-brand-700 no-underline hover:underline">
                  Sell used
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </section>
    </div>
  );
}

export default function ReaderHome(props: Props) {
  return (
    <Island>
      <ReaderHomeInner {...props} />
    </Island>
  );
}
