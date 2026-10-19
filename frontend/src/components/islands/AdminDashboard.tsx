import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Island from './Island';
import {
  approveAdminPayout,
  confirmAdminCodRemit,
  fetchAdminClaims,
  fetchAdminKpis,
  fetchAdminMarginWarnings,
  fetchAdminOrders,
  fetchAdminPayouts,
  fetchAdminReconcile,
  fetchAdminRoleApplications,
  fetchAdminSettings,
  runAdminPayoutBatch,
} from '../../lib/dashboardApi';

type Tab = 'kpis' | 'approvals' | 'orders' | 'claims' | 'payouts' | 'money' | 'settings';

function AdminDashboardInner() {
  const [tab, setTab] = useState<Tab>('kpis');
  const [codOrderId, setCodOrderId] = useState('');
  const [moneyMsg, setMoneyMsg] = useState<string | null>(null);
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
  const reconcile = useQuery({
    queryKey: ['admin', 'reconcile'],
    queryFn: fetchAdminReconcile,
    enabled: tab === 'money',
  });

  const approvePayout = useMutation({
    mutationFn: approveAdminPayout,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'payouts'] }),
  });

  const payoutBatch = useMutation({
    mutationFn: runAdminPayoutBatch,
    onSuccess: () => {
      setMoneyMsg('Payout batch started / completed.');
      void qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    },
    onError: (e: Error) => setMoneyMsg(e.message),
  });

  const codRemit = useMutation({
    mutationFn: () => confirmAdminCodRemit(codOrderId.trim()),
    onSuccess: () => {
      setMoneyMsg(`COD remitted for ${codOrderId.trim()}`);
      setCodOrderId('');
    },
    onError: (e: Error) => setMoneyMsg(e.message),
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'kpis', label: 'KPIs' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'orders', label: 'Orders' },
    { id: 'claims', label: 'Claims' },
    { id: 'payouts', label: 'Payouts' },
    { id: 'money', label: 'Money' },
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

        {tab === 'money' && (
          <div className="space-y-6">
            <section aria-labelledby="reconcile-heading">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="reconcile-heading" className="m-0 text-base font-bold text-ink-900">
                  Reconcile orders vs ledger
                </h2>
                <button
                  type="button"
                  className="rounded-[var(--radius-card)] border border-line bg-sand px-3 py-1.5 text-xs font-semibold"
                  onClick={() => void reconcile.refetch()}
                >
                  Refresh
                </button>
              </div>
              {reconcile.isLoading && <p className="text-ink-500">Running reconcile…</p>}
              {reconcile.isError && (
                <p className="text-urgent-600" role="alert">
                  Reconcile failed.{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void reconcile.refetch()}
                  >
                    Retry
                  </button>
                </p>
              )}
              {reconcile.data && (
                <>
                  <p className={reconcile.data.ok ? 'text-leaf-700' : 'text-urgent-600'}>
                    {reconcile.data.ok
                      ? 'All captured orders match ledger SALE+COMMISSION.'
                      : `${reconcile.data.issues.length} issue(s) found.`}
                  </p>
                  <ul className="mt-2 list-none space-y-2 p-0">
                    {reconcile.data.issues.map((i) => (
                      <li
                        key={i.orderId}
                        className="rounded-[var(--radius-card)] border border-urgent-600/30 bg-paper p-3 font-mono text-xs"
                      >
                        <div className="font-semibold text-ink-900">{i.orderId}</div>
                        <div className="text-ink-500">{i.message}</div>
                        <div>
                          expected {i.expectedPaisa} paisa · ledger {i.ledgerPaisa} paisa
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section aria-labelledby="payout-batch-heading">
              <h2 id="payout-batch-heading" className="m-0 text-base font-bold text-ink-900">
                Weekly payout batch
              </h2>
              <p className="mt-1 text-ink-500">
                Creates pending payouts from available escrow balances (server-side).
              </p>
              <button
                type="button"
                className="mt-2 rounded-[var(--radius-card)] bg-leaf-600 px-3 py-2 text-sm font-semibold text-paper"
                disabled={payoutBatch.isPending}
                onClick={() => {
                  if (window.confirm('Run weekly payout batch now?')) payoutBatch.mutate();
                }}
              >
                {payoutBatch.isPending ? 'Running…' : 'Run payout batch'}
              </button>
            </section>

            <section aria-labelledby="cod-remit-heading">
              <h2 id="cod-remit-heading" className="m-0 text-base font-bold text-ink-900">
                Confirm COD remit
              </h2>
              <p className="mt-1 text-ink-500">
                Mark courier COD remittance received for an order.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  className="min-h-10 min-w-[16rem] flex-1 rounded-[var(--radius-card)] border border-line px-3 text-sm"
                  placeholder="Order id"
                  value={codOrderId}
                  onChange={(e) => setCodOrderId(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-[var(--radius-card)] bg-cta-500 px-3 py-2 text-sm font-semibold text-ink-900"
                  disabled={codRemit.isPending || !codOrderId.trim()}
                  onClick={() => {
                    if (window.confirm(`Confirm COD remit for ${codOrderId.trim()}?`)) {
                      codRemit.mutate();
                    }
                  }}
                >
                  {codRemit.isPending ? 'Saving…' : 'Confirm remit'}
                </button>
              </div>
            </section>

            {moneyMsg ? (
              <p className="m-0 text-sm text-ink-700" role="status">
                {moneyMsg}
              </p>
            ) : null}
          </div>
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
