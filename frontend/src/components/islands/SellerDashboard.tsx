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
import { useMockData } from '../../lib/mockMode';
import { SELLER_ROLE_UI, type SellerRole, type SellerTab } from '../../lib/sellerRoleUi';
import SellerCatalogForm from './SellerCatalogForm';

function SkeletonRows() {
  return (
    <div className="space-y-2" aria-busy="true">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-[var(--radius-card)] bg-sand" />
      ))}
    </div>
  );
}

type Props = {
  role: SellerRole;
};

function SellerDashboardInner({ role }: Props) {
  const ui = SELLER_ROLE_UI[role];
  const [tab, setTab] = useState<SellerTab>('overview');
  const qc = useQueryClient();
  const mock = useMockData();

  const overview = useQuery({
    queryKey: ['seller', 'overview', role],
    queryFn: async () => {
      if (mock) return ui.overview;
      return fetchSellerOverview();
    },
  });
  const listings = useQuery({
    queryKey: ['seller', 'listings', role],
    queryFn: async () => {
      if (mock) {
        return {
          items: ui.sampleListings.map((l, i) => ({
            id: `mock-${role.toLowerCase()}-${i}`,
            bookTitle: l.title,
            price: l.price,
            stock: l.stock,
            reservedQty: 0,
            status: 'ACTIVE',
            updatedAt: new Date().toISOString(),
          })),
          nextCursor: null as string | null,
        };
      }
      return fetchSellerListings();
    },
    enabled: tab === 'inventory',
  });
  const orders = useQuery({
    queryKey: ['seller', 'orders', 'to_pack', role],
    queryFn: () => fetchSellerOrders('to_pack'),
    enabled: tab === 'orders',
  });
  const earnings = useQuery({
    queryKey: ['seller', 'earnings', role],
    queryFn: fetchSellerEarnings,
    enabled: tab === 'earnings',
  });
  const payouts = useQuery({
    queryKey: ['seller', 'payouts', role],
    queryFn: fetchSellerPayouts,
    enabled: tab === 'payouts',
  });
  const claims = useQuery({
    queryKey: ['seller', 'claims', role],
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

  return (
    <div className="pb-24">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-[var(--radius-card)] px-2.5 py-1 text-xs font-bold ${ui.badgeClass}`}
        >
          {ui.badge}
        </span>
        <p className="m-0 text-sm text-ink-500">{ui.blurb}</p>
      </div>
      {ui.growthLink ? (
        <p className="mb-4 text-sm">
          <a
            href={ui.growthLink}
            className="font-semibold text-brand-700 no-underline hover:underline"
          >
            Open growth &amp; sponsored tools →
          </a>
        </p>
      ) : null}

      <nav className="flex flex-wrap gap-2" aria-label={`${ui.badge} sections`}>
        {ui.tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`cursor-pointer rounded-[var(--radius-card)] px-3 py-1.5 text-sm font-semibold ${
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
                  <dt className="text-ink-500">{role === 'WRITER' ? 'Title sales' : 'Orders'}</dt>
                  <dd className="text-xl font-bold text-ink-900">{overview.data.ordersTotal}</dd>
                </div>
                <div className="rounded-[var(--radius-card)] border border-line bg-paper p-3">
                  <dt className="text-ink-500">{ui.ordersLabel}</dt>
                  <dd className="text-xl font-bold text-ink-900">{overview.data.ordersToPack}</dd>
                </div>
                <div className="rounded-[var(--radius-card)] border border-line bg-paper p-3">
                  <dt className="text-ink-500">
                    {role === 'WRITER' ? 'Royalties (30d)' : 'Sales (30d)'}
                  </dt>
                  <dd className="text-xl font-bold text-ink-900">
                    ৳{overview.data.salesLast30DaysBdt}
                  </dd>
                </div>
                <div className="rounded-[var(--radius-card)] border border-line bg-paper p-3">
                  <dt className="text-ink-500">Open claims</dt>
                  <dd className="text-xl font-bold text-ink-900">{overview.data.openClaims}</dd>
                </div>
                <div className="col-span-2 rounded-[var(--radius-card)] border border-line bg-leaf-50 p-3">
                  <dt className="text-ink-500">
                    {role === 'WRITER' ? 'Royalty balance' : 'Balance'}
                  </dt>
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
            <h2 className="m-0 mb-3 font-display text-lg font-bold text-ink-900">
              {ui.inventoryLabel}
            </h2>
            {role !== 'WRITER' ? (
              <SellerCatalogForm />
            ) : (
              <p className="mb-3 text-sm text-ink-500">
                Titles are linked via publisher contracts. Request a reprint from the book page when
                stock is low.
              </p>
            )}
            {listings.isLoading && <SkeletonRows />}
            {listings.isError && (
              <p className="text-urgent-600">
                Error loading listings.{' '}
                <button type="button" onClick={() => listings.refetch()}>
                  Retry
                </button>
              </p>
            )}
            {listings.data?.items.length === 0 && (
              <p className="text-ink-500">Nothing listed yet.</p>
            )}
            <ul className="list-none space-y-2 p-0">
              {listings.data?.items.map((l) => (
                <li
                  key={l.id}
                  className="flex justify-between gap-2 rounded-[var(--radius-card)] border border-line bg-paper px-3 py-2 text-sm"
                >
                  <span>{l.bookTitle}</span>
                  <span className="font-semibold text-ink-700">
                    {role === 'WRITER' ? l.price : `৳${l.price} · stock ${l.stock}`}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'orders' && (
          <>
            <h2 className="m-0 mb-3 font-display text-lg font-bold text-ink-900">
              {ui.ordersLabel}
            </h2>
            {role === 'WRITER' ? (
              <p className="mb-3 text-sm text-ink-500">
                Writers do not pack shipments — these are sales attributed to your titles.
              </p>
            ) : null}
            {orders.isLoading && <SkeletonRows />}
            {orders.data?.items.length === 0 && (
              <p className="text-ink-500">
                {role === 'WRITER' ? 'No recent title sales.' : 'No orders waiting to pack.'}
              </p>
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
                  {role !== 'WRITER' && o.status === 'PROCESSING' && (
                    <button
                      type="button"
                      className="mt-2 cursor-pointer rounded-[var(--radius-card)] bg-cta-500 px-3 py-1.5 text-xs font-bold text-ink-900"
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
            <h2 className="m-0 mb-3 font-display text-lg font-bold text-ink-900">
              {ui.earningsLabel}
            </h2>
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

export default function SellerDashboard({ role }: Props) {
  return (
    <Island>
      <SellerDashboardInner role={role} />
    </Island>
  );
}
