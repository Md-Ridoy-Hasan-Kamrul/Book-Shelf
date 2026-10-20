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
import { fh } from '../../lib/freshHuman';
import { useMockData } from '../../lib/mockMode';
import { SELLER_ROLE_UI, type SellerRole, type SellerTab } from '../../lib/sellerRoleUi';
import DashboardShell, { DashPanel, DashStat } from './DashboardShell';
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
  userName?: string;
  userEmail?: string;
};

function SellerDashboardInner({ role, userName, userEmail }: Props) {
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

  const navItems = ui.tabs.map((t) => ({
    id: t.id,
    label: t.label,
  }));

  return (
    <DashboardShell
      title="Dashboard"
      subtitle={`${ui.blurb} Serving buyers across Bangladesh.`}
      badge={ui.badge}
      badgeClassName={ui.badgeClass}
      userName={userName}
      userEmail={userEmail}
      items={navItems}
      activeId={tab}
      onNavigate={setTab}
      headerActions={
        <>
          <button type="button" className={fh.btnCta} onClick={() => setTab('inventory')}>
            {role === 'WRITER' ? 'Titles' : 'Add stock'}
          </button>
          <button type="button" className={fh.btnGhost} onClick={() => setTab('orders')}>
            {ui.ordersLabel}
          </button>
        </>
      }
      footer={
        <div className="space-y-2">
          {ui.growthLink ? (
            <a
              href={ui.growthLink}
              className="block text-xs font-semibold text-brand-700 no-underline hover:underline"
            >
              Growth tools
            </a>
          ) : null}
          <a
            href="/account"
            className="block text-xs font-semibold text-ink-500 no-underline hover:text-brand-700"
          >
            Account settings
          </a>
        </div>
      }
    >
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
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3 min-[720px]:grid-cols-4">
                <DashStat
                  label={role === 'WRITER' ? 'Title sales' : 'Orders'}
                  value={overview.data.ordersTotal}
                  tone="brand"
                />
                <DashStat label={ui.ordersLabel} value={overview.data.ordersToPack} />
                <DashStat
                  label={role === 'WRITER' ? 'Royalties (30d)' : 'Sales (30d)'}
                  value={`৳${overview.data.salesLast30DaysBdt}`}
                  tone="leaf"
                />
                <DashStat label="Open claims" value={overview.data.openClaims} />
              </div>

              <div className="grid gap-4 min-[720px]:grid-cols-2">
                <DashPanel title={role === 'WRITER' ? 'Royalty balance' : 'Wallet'}>
                  <dl className="m-0 grid gap-2">
                    <div className="flex justify-between gap-2 rounded-[var(--radius-card)] bg-sand px-3 py-2">
                      <dt className="text-ink-500">Pending</dt>
                      <dd className="m-0 font-bold text-ink-900">
                        ৳{overview.data.balancePendingBdt}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 rounded-[var(--radius-card)] bg-leaf-50 px-3 py-2">
                      <dt className="text-ink-500">Available</dt>
                      <dd className="m-0 font-bold text-leaf-700">
                        ৳{overview.data.balanceAvailableBdt}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className={`mt-3 ${fh.btnGhost}`}
                    onClick={() => setTab('payouts')}
                  >
                    Payouts
                  </button>
                </DashPanel>

                <DashPanel
                  title="Next steps"
                  action={
                    <button
                      type="button"
                      className="text-xs font-semibold text-brand-700"
                      onClick={() => setTab('orders')}
                    >
                      Open queue
                    </button>
                  }
                >
                  <ul className="m-0 list-none space-y-2 p-0 text-sm">
                    <li className="flex gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cta-500" aria-hidden />
                      <span>
                        <span className="font-semibold text-ink-900">{ui.ordersLabel}</span>
                        <span className="block text-xs text-ink-500">
                          {overview.data.ordersToPack} waiting
                        </span>
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600"
                        aria-hidden
                      />
                      <span>
                        <span className="font-semibold text-ink-900">{ui.inventoryLabel}</span>
                        <span className="block text-xs text-ink-500">Keep stock fresh</span>
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-leaf-600"
                        aria-hidden
                      />
                      <span>
                        <span className="font-semibold text-ink-900">Claims</span>
                        <span className="block text-xs text-ink-500">
                          {overview.data.openClaims} open
                        </span>
                      </span>
                    </li>
                  </ul>
                </DashPanel>
              </div>
            </div>
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
          {listings.data?.items.length === 0 && <p className="text-ink-500">Nothing listed yet.</p>}
          <ul className="list-none space-y-2 p-0">
            {listings.data?.items.map((l) => (
              <li key={l.id} className={`flex justify-between gap-2 text-sm ${fh.listRow}`}>
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
          <h2 className="m-0 mb-3 font-display text-lg font-bold text-ink-900">{ui.ordersLabel}</h2>
          {role === 'WRITER' ? (
            <p className="mb-3 text-sm text-ink-500">
              Writers do not pack shipments: these are sales attributed to your titles.
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
                    className={`mt-2 ${fh.btnCta}`}
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
                    {line.title}: seller ৳{line.sellerAmount}, commission ৳{line.commissionAmount} (
                    {line.commissionBps} bps)
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
                <strong>{c.status}</strong>: {c.reason.slice(0, 120)}
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardShell>
  );
}

export default function SellerDashboard(props: Props) {
  return (
    <Island>
      <SellerDashboardInner {...props} />
    </Island>
  );
}
