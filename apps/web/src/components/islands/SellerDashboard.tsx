import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Island from './Island';
import {
  fetchSellerClaims,
  fetchSellerEarnings,
  fetchSellerListings,
  fetchSellerOrders,
  fetchSellerOverview,
  fetchSellerPayouts,
  packSellerOrder,
} from '../../lib/dashboardApi';

type Tab = 'overview' | 'inventory' | 'orders' | 'earnings' | 'payouts' | 'claims';

function SkeletonRows() {
  return (
    <div className="space-y-2" aria-busy="true">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-[var(--radius-card)] bg-sand" />
      ))}
    </div>
  );
}

function SellerDashboardInner() {
  const [tab, setTab] = useState<Tab>('overview');
  const qc = useQueryClient();

  const overview = useQuery({ queryKey: ['seller', 'overview'], queryFn: fetchSellerOverview });
  const listings = useQuery({
    queryKey: ['seller', 'listings'],
    queryFn: () => fetchSellerListings(),
    enabled: tab === 'inventory',
  });
  const orders = useQuery({
    queryKey: ['seller', 'orders', 'to_pack'],
    queryFn: () => fetchSellerOrders('to_pack'),
    enabled: tab === 'orders',
  });
  const earnings = useQuery({
    queryKey: ['seller', 'earnings'],
    queryFn: fetchSellerEarnings,
    enabled: tab === 'earnings',
  });
  const payouts = useQuery({
    queryKey: ['seller', 'payouts'],
    queryFn: fetchSellerPayouts,
    enabled: tab === 'payouts',
  });
  const claims = useQuery({
    queryKey: ['seller', 'claims'],
    queryFn: fetchSellerClaims,
    enabled: tab === 'claims',
  });

  const pack = useMutation({
    mutationFn: packSellerOrder,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['seller', 'orders'] });
      void qc.invalidateQueries({ queryKey: ['seller', 'overview'] });
    },
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'orders', label: 'Orders' },
    { id: 'earnings', label: 'Earnings' },
    { id: 'payouts', label: 'Payouts' },
    { id: 'claims', label: 'Claims' },
  ];

  return (
    <div className="pb-24">
      <nav className="flex flex-wrap gap-2" aria-label="Seller sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              tab === t.id ? 'bg-brand-600 text-paper' : 'bg-sand text-ink-700'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === 'overview' && (
          <>
            {overview.isLoading && <SkeletonRows />}
            {overview.isError && (
              <p className="text-urgent-600" role="alert">
                Could not load overview.{' '}
                <button type="button" className="underline" onClick={() => overview.refetch()}>
                  Retry
                </button>
              </p>
            )}
            {overview.data && (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-[var(--radius-card)] border border-line bg-paper p-3">
                  <dt className="text-ink-500">Orders</dt>
                  <dd className="text-xl font-bold text-ink-900">{overview.data.ordersTotal}</dd>
                </div>
                <div className="rounded-[var(--radius-card)] border border-line bg-paper p-3">
                  <dt className="text-ink-500">To pack</dt>
                  <dd className="text-xl font-bold text-ink-900">{overview.data.ordersToPack}</dd>
                </div>
                <div className="rounded-[var(--radius-card)] border border-line bg-paper p-3">
                  <dt className="text-ink-500">Sales (30d)</dt>
                  <dd className="text-xl font-bold text-ink-900">
                    ৳{overview.data.salesLast30DaysBdt}
                  </dd>
                </div>
                <div className="rounded-[var(--radius-card)] border border-line bg-paper p-3">
                  <dt className="text-ink-500">Open claims</dt>
                  <dd className="text-xl font-bold text-ink-900">{overview.data.openClaims}</dd>
                </div>
                <div className="col-span-2 rounded-[var(--radius-card)] border border-line bg-leaf-50 p-3">
                  <dt className="text-ink-500">Balance</dt>
                  <dd className="font-semibold text-ink-900">
                    Pending ৳{overview.data.balancePendingBdt} · Available ৳
                    {overview.data.balanceAvailableBdt}
                  </dd>
                </div>
              </dl>
            )}
          </>
        )}

        {tab === 'inventory' && (
          <>
            {listings.isLoading && <SkeletonRows />}
            {listings.isError && (
              <p className="text-urgent-600">
                Error loading listings.{' '}
                <button type="button" onClick={() => listings.refetch()}>
                  Retry
                </button>
              </p>
            )}
            {listings.data?.items.length === 0 && <p className="text-ink-500">No listings yet.</p>}
            <ul className="list-none space-y-2 p-0">
              {listings.data?.items.map((l) => (
                <li
                  key={l.id}
                  className="flex justify-between gap-2 rounded-[var(--radius-card)] border border-line bg-paper px-3 py-2 text-sm"
                >
                  <span>{l.bookTitle}</span>
                  <span className="font-semibold">
                    ৳{l.price} · stock {l.stock}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'orders' && (
          <>
            {orders.isLoading && <SkeletonRows />}
            {orders.data?.items.length === 0 && (
              <p className="text-ink-500">No orders waiting to pack.</p>
            )}
            <ul className="list-none space-y-2 p-0">
              {orders.data?.items.map((o) => (
                <li
                  key={o.id}
                  className="rounded-[var(--radius-card)] border border-line bg-paper px-3 py-2 text-sm"
                >
                  <div className="flex justify-between">
                    <span className="font-semibold">{o.status}</span>
                    <span>৳{o.total}</span>
                  </div>
                  <div className="text-ink-500">{o.buyerName}</div>
                  {o.status === 'PROCESSING' && (
                    <button
                      type="button"
                      className="mt-2 rounded-[var(--radius-card)] bg-cta-500 px-3 py-1.5 text-xs font-bold text-ink-900"
                      disabled={pack.isPending}
                      onClick={() => pack.mutate(o.id)}
                    >
                      Mark packed
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'earnings' && (
          <>
            {earnings.isLoading && <SkeletonRows />}
            {earnings.data?.items.length === 0 && <p className="text-ink-500">No earnings yet.</p>}
            <ul className="list-none space-y-3 p-0">
              {earnings.data?.items.map((e) => (
                <li
                  key={e.orderId}
                  className="rounded-[var(--radius-card)] border border-line p-3 text-sm"
                >
                  <div className="font-semibold">
                    Order {e.orderId.slice(0, 8)} · ৳{e.orderTotal}
                  </div>
                  {e.lines.map((line, i) => (
                    <div key={i} className="mt-1 text-ink-500">
                      {line.title}: seller ৳{line.sellerAmount}, commission ৳{line.commissionAmount}{' '}
                      ({line.commissionBps} bps)
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'payouts' && (
          <>
            {payouts.isLoading && <SkeletonRows />}
            {payouts.data?.items.length === 0 && <p className="text-ink-500">No payouts yet.</p>}
            <ul className="list-none space-y-2 p-0">
              {payouts.data?.items.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between rounded-[var(--radius-card)] border border-line p-3 text-sm"
                >
                  <span>{p.status}</span>
                  <span className="font-semibold">৳{p.amount}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'claims' && (
          <>
            {claims.isLoading && <SkeletonRows />}
            {claims.data?.items.length === 0 && (
              <p className="text-ink-500">No claims on your orders.</p>
            )}
            <ul className="list-none space-y-2 p-0">
              {claims.data?.items.map((c) => (
                <li
                  key={c.orderId}
                  className="rounded-[var(--radius-card)] border border-line p-3 text-sm"
                >
                  <strong>{c.status}</strong> — {c.reason.slice(0, 120)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  return (
    <Island>
      <SellerDashboardInner />
    </Island>
  );
}
