import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Island from './Island';
import {
  approveAdminPayout,
  fetchAdminClaims,
  fetchAdminKpis,
  fetchAdminMarginWarnings,
  fetchAdminOrders,
  fetchAdminPayouts,
  fetchAdminRoleApplications,
  fetchAdminSettings,
} from '../../lib/dashboardApi';

type Tab = 'kpis' | 'approvals' | 'orders' | 'claims' | 'payouts' | 'settings';

function AdminDashboardInner() {
  const [tab, setTab] = useState<Tab>('kpis');
  const qc = useQueryClient();

  const kpis = useQuery({ queryKey: ['admin', 'kpis'], queryFn: fetchAdminKpis });
  const margin = useQuery({
    queryKey: ['admin', 'margin'],
    queryFn: fetchAdminMarginWarnings,
    enabled: tab === 'kpis',
  });
  const apps = useQuery({
    queryKey: ['admin', 'role-apps'],
    queryFn: fetchAdminRoleApplications,
    enabled: tab === 'approvals',
  });
  const orders = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: fetchAdminOrders,
    enabled: tab === 'orders',
  });
  const claims = useQuery({
    queryKey: ['admin', 'claims'],
    queryFn: fetchAdminClaims,
    enabled: tab === 'claims',
  });
  const payouts = useQuery({
    queryKey: ['admin', 'payouts'],
    queryFn: fetchAdminPayouts,
    enabled: tab === 'payouts',
  });
  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: fetchAdminSettings,
    enabled: tab === 'settings',
  });

  const approvePayout = useMutation({
    mutationFn: approveAdminPayout,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'payouts'] }),
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'kpis', label: 'KPIs' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'orders', label: 'Orders' },
    { id: 'claims', label: 'Claims' },
    { id: 'payouts', label: 'Payouts' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="pb-24">
      <nav className="flex flex-wrap gap-2" aria-label="Admin sections">
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

      <div className="mt-6 text-sm">
        {tab === 'kpis' && (
          <>
            {kpis.isLoading && <p className="text-ink-500">Loading KPIs…</p>}
            {kpis.isError && (
              <p className="text-urgent-600">
                Failed.{' '}
                <button type="button" onClick={() => kpis.refetch()}>
                  Retry
                </button>
              </p>
            )}
            {kpis.data && (
              <>
                <dl className="grid grid-cols-2 gap-2">
                  <div className="rounded-(--radius-card) border border-line p-3">
                    <dt className="text-ink-500">GMV</dt>
                    <dd className="text-lg font-bold">৳{kpis.data.gmvBdt}</dd>
                  </div>
                  <div className="rounded-(--radius-card) border border-line p-3">
                    <dt className="text-ink-500">Orders</dt>
                    <dd className="text-lg font-bold">{kpis.data.orderCount}</dd>
                  </div>
                  <div className="rounded-(--radius-card) border border-line p-3">
                    <dt className="text-ink-500">AOV</dt>
                    <dd className="text-lg font-bold">৳{kpis.data.aovBdt}</dd>
                  </div>
                  <div className="rounded-(--radius-card) border border-line p-3">
                    <dt className="text-ink-500">Take rate</dt>
                    <dd className="text-lg font-bold">{kpis.data.takeRatePct}%</dd>
                  </div>
                  <div className="rounded-(--radius-card)er border-line p-3">
                    <dt className="text-ink-500">RTO rate</dt>
                    <dd>{kpis.data.rtoRatePct}%</dd>
                  </div>
                  <div className="rounded-(--radius-card) border border-line p-3">
                    <dt className="text-ink-500">Claim rate</dt>
                    <dd>{kpis.data.claimRatePct}%</dd>
                  </div>
                </dl>
                <section className="mt-6">
                  <h2 className="text-base font-bold text-ink-900">Margin-guard warnings</h2>
                  {margin.data?.items.length === 0 && (
                    <p className="text-ink-500">No low-margin listings flagged.</p>
                  )}
                  <ul className="mt-2 list-none space-y-1 p-0">
                    {margin.data?.items.slice(0, 5).map((w) => (
                      <li
                        key={w.listingId}
                        className="rounded border border-sun-200 bg-sun-100 px-2 py-1 text-sun-800"
                      >
                        {w.bookTitle} — commission {w.commissionBps} bps
                        {w.commissionBdt && w.floorBdt
                          ? ` (৳${w.commissionBdt} < floor ৳${w.floorBdt})`
                          : ''}{' '}
                        · ৳{w.price}
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}
          </>
        )}

        {tab === 'approvals' && (
          <>
            {apps.data?.items.length === 0 && (
              <p className="text-ink-500">No pending role applications.</p>
            )}
            <ul className="list-none space-y-2 p-0">
              {apps.data?.items.map((a) => (
                <li key={a.id} className="rounded-(--radius-card) border border-line p-3">
                  <strong>{a.type}</strong> — {a.userName} ({a.userEmail})
                  <div className="text-ink-500">{a.status}</div>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'orders' && (
          <ul className="list-none space-y-2 p-0">
            {orders.data?.items.map((o) => (
              <li
                key={o.id}
                className="flex justify-between rounded-(--radius-card)er border-line p-3"
              >
                <span>{o.sellerName}</span>
                <span>
                  {o.status} · ৳{o.total}
                </span>
              </li>
            ))}
          </ul>
        )}

        {tab === 'claims' && (
          <ul className="list-none space-y-3 p-0">
            {claims.data?.items.map((c) => (
              <li key={c.id} className="rounded-(--radius-card) border border-line p-3">
                <div className="font-semibold">
                  {c.status} · {c.buyerName} → {c.sellerName}
                </div>
                <p className="text-ink-700">{c.reason}</p>
                {c.images.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2 p-0">
                    {c.images.map((url) => (
                      <li key={url}>
                        <a href={url} className="text-brand-700" target="_blank" rel="noreferrer">
                          Evidence
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        {tab === 'payouts' && (
          <ul className="list-none space-y-2 p-0">
            {payouts.data?.items.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-(--radius-card) border border-line p-3"
              >
                <span>
                  {p.ownerName} · ৳{p.amount}
                </span>
                <span>{p.status}</span>
                {p.status === 'PENDING' && (
                  <button
                    type="button"
                    className="rounded-(--radius-card) bg-leaf-600 px-2 py-1 text-xs font-semibold text-paper"
                    onClick={() => approvePayout.mutate(p.id)}
                  >
                    Approve
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {tab === 'settings' && (
          <ul className="list-none space-y-1 p-0 font-mono text-xs">
            {settings.data?.map((s) => (
              <li key={s.key} className="rounded border border-line px-2 py-1">
                {s.key}: {JSON.stringify(s.value)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Island>
      <AdminDashboardInner />
    </Island>
  );
}
