import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fh } from '../../lib/freshHuman';
import AdminDeadLetterPanel from './AdminDeadLetterPanel';
import DashboardShell, { DashPanel, DashStat, type DashboardNavItem } from './DashboardShell';
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

type Tab = 'kpis' | 'approvals' | 'orders' | 'claims' | 'payouts' | 'money' | 'jobs' | 'settings';

type Props = {
  userName?: string;
  userEmail?: string;
};

const ADMIN_NAV: DashboardNavItem<Tab>[] = [
  { id: 'kpis', label: 'Overview', hint: 'GMV & health' },
  { id: 'approvals', label: 'Approvals', hint: 'Seller roles' },
  { id: 'orders', label: 'Orders', hint: 'Nationwide' },
  { id: 'claims', label: 'Claims', hint: 'Disputes' },
  { id: 'payouts', label: 'Payouts', hint: 'Escrow release' },
  { id: 'money', label: 'Money desk', hint: 'Reconcile · COD' },
  { id: 'jobs', label: 'Failed jobs', hint: 'Dead-letter' },
  { id: 'settings', label: 'Settings', hint: 'System keys' },
];

/** Decorative weekly pulse heights (UI only; real series later). */
const WEEK_BARS = [42, 68, 55, 80, 48, 72, 90];

function AdminDashboardInner({ userName, userEmail }: Props) {
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
    enabled: tab === 'approvals' || tab === 'kpis',
  });
  const orders = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: fetchAdminOrders,
    enabled: tab === 'orders' || tab === 'kpis',
  });
  const claims = useQuery({
    queryKey: ['admin', 'claims'],
    queryFn: fetchAdminClaims,
    enabled: tab === 'claims' || tab === 'kpis',
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

  const pendingApps = apps.data?.items.filter((a) => a.status === 'PENDING').length ?? 0;
  const nav = ADMIN_NAV.map((item) =>
    item.id === 'approvals' && pendingApps > 0
      ? { ...item, badge: pendingApps > 9 ? '9+' : String(pendingApps) }
      : item,
  );

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

  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Plan payouts, clear claims, and keep Bangladesh GMV healthy."
      badge="Admin"
      badgeClassName="bg-brand-100 text-brand-700"
      userName={userName}
      userEmail={userEmail}
      items={nav}
      activeId={tab}
      onNavigate={setTab}
      headerActions={
        <>
          <button type="button" className={fh.btnLeaf} onClick={() => setTab('money')}>
            Money desk
          </button>
          <button type="button" className={fh.btnGhost} onClick={() => setTab('approvals')}>
            Approvals
          </button>
        </>
      }
    >
      {tab === 'kpis' && (
        <>
          {kpis.isLoading && <p className="text-ink-500">Loading KPIs…</p>}
          {kpis.isError && (
            <p className="text-urgent-600" role="alert">
              Failed.{' '}
              <button type="button" className="underline" onClick={() => kpis.refetch()}>
                Retry
              </button>
            </p>
          )}
          {kpis.data && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-2 min-[375px]:gap-3 min-[768px]:grid-cols-4 min-[1440px]:gap-4">
                <DashStat
                  label="GMV"
                  value={`৳${kpis.data.gmvBdt}`}
                  hint="Platform volume"
                  tone="brand"
                />
                <DashStat label="Orders" value={kpis.data.orderCount} hint="All statuses" />
                <DashStat label="AOV" value={`৳${kpis.data.aovBdt}`} hint="Avg order" />
                <DashStat
                  label="Take rate"
                  value={`${kpis.data.takeRatePct}%`}
                  hint="Commission share"
                  tone="leaf"
                />
              </div>

              <div className="grid gap-4 min-[900px]:grid-cols-[1.2fr_0.9fr_0.9fr]">
                <DashPanel title="Order pulse">
                  <p className="m-0 mb-3 text-xs text-ink-500">
                    Illustrative weekly activity (live series later).
                  </p>
                  <div
                    className="flex h-36 items-end gap-2"
                    role="img"
                    aria-label="Weekly order pulse chart"
                  >
                    {WEEK_BARS.map((h, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-t-[6px] ${i === 6 ? 'bg-brand-600' : i % 2 === 0 ? 'bg-brand-100' : 'bg-leaf-100'}`}
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[0.6rem] font-semibold text-ink-300">
                          {'SMTWTFS'[i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </DashPanel>

                <DashPanel title="Needs attention">
                  <div className="space-y-3">
                    <div className="rounded-[var(--radius-card)] bg-sand p-3">
                      <p className="m-0 text-xs font-semibold text-ink-500">Open claims</p>
                      <p className="m-0 mt-1 font-display text-xl font-bold text-ink-900">
                        {claims.data?.items.length ?? '…'}
                      </p>
                      <button
                        type="button"
                        className={`mt-2 ${fh.btnGhost}`}
                        onClick={() => setTab('claims')}
                      >
                        Review claims
                      </button>
                    </div>
                    <div className="rounded-[var(--radius-card)] border border-line p-3">
                      <p className="m-0 text-xs font-semibold text-ink-500">RTO · Claim rate</p>
                      <p className="m-0 mt-1 text-sm font-bold text-ink-900">
                        {kpis.data.rtoRatePct}% · {kpis.data.claimRatePct}%
                      </p>
                    </div>
                  </div>
                </DashPanel>

                <DashPanel
                  title="Queue"
                  action={
                    <button
                      type="button"
                      className="text-xs font-semibold text-brand-700"
                      onClick={() => setTab('approvals')}
                    >
                      + New
                    </button>
                  }
                >
                  <ul className="m-0 list-none space-y-2 p-0">
                    {(apps.data?.items.slice(0, 4) ?? []).map((a) => (
                      <li key={a.id} className="flex gap-2 text-sm">
                        <span
                          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600"
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink-900">
                            {a.type}: {a.userName}
                          </span>
                          <span className="block text-xs text-ink-500">{a.status}</span>
                        </span>
                      </li>
                    ))}
                    {(apps.data?.items.length ?? 0) === 0 ? (
                      <li className="text-ink-500">No pending applications.</li>
                    ) : null}
                  </ul>
                </DashPanel>
              </div>

              <div className="grid gap-4 min-[900px]:grid-cols-[1.2fr_1fr]">
                <DashPanel title="Recent orders">
                  <ul className="m-0 list-none divide-y divide-line p-0">
                    {(orders.data?.items.slice(0, 5) ?? []).map((o) => (
                      <li
                        key={o.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink-900">
                            {o.sellerName}
                          </span>
                          <span className="block text-xs text-ink-500">{o.status}</span>
                        </span>
                        <span className="text-sm font-bold text-ink-900">৳{o.total}</span>
                      </li>
                    ))}
                    {(orders.data?.items.length ?? 0) === 0 ? (
                      <li className="text-ink-500">No orders yet.</li>
                    ) : null}
                  </ul>
                  <button
                    type="button"
                    className={`mt-3 ${fh.btnGhost}`}
                    onClick={() => setTab('orders')}
                  >
                    All orders
                  </button>
                </DashPanel>

                <DashPanel title="Margin guard">
                  {(margin.data?.items.length ?? 0) === 0 ? (
                    <p className="m-0 text-ink-500">No low-margin listings flagged.</p>
                  ) : (
                    <ul className="m-0 list-none space-y-2 p-0">
                      {margin.data?.items.slice(0, 5).map((w) => (
                        <li
                          key={w.listingId}
                          className="rounded-[var(--radius-card)] border border-sun-200 bg-sun-100 px-3 py-2 text-sm text-sun-800"
                        >
                          <span className="font-semibold">{w.bookTitle}</span>
                          <span className="block text-xs">
                            {w.commissionBps} bps · ৳{w.price}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </DashPanel>
              </div>
            </div>
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
              <li key={a.id} className={fh.listRow}>
                <strong className="text-ink-900">{a.type}</strong>
                <span className="text-ink-700">
                  {' '}
                  : {a.userName} ({a.userEmail})
                </span>
                <div className="text-ink-500">{a.status}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'orders' && (
        <ul className="list-none space-y-2 p-0">
          {orders.data?.items.map((o) => (
            <li key={o.id} className={`flex justify-between gap-2 ${fh.listRow}`}>
              <span className="text-ink-900">{o.sellerName}</span>
              <span className="text-ink-700">
                {o.status} · ৳{o.total}
              </span>
            </li>
          ))}
        </ul>
      )}

      {tab === 'claims' && (
        <ul className="list-none space-y-3 p-0">
          {claims.data?.items.map((c) => (
            <li key={c.id} className={fh.listRow}>
              <div className="font-semibold text-ink-900">
                {c.status} · {c.buyerName} → {c.sellerName}
              </div>
              <p className="m-0 mt-1 text-ink-700">{c.reason}</p>
              {c.images.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2 p-0">
                  {c.images.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        className="font-semibold text-brand-700 no-underline hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
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
              className={`flex flex-wrap items-center justify-between gap-2 ${fh.listRow}`}
            >
              <span className="text-ink-900">
                {p.ownerName} · ৳{p.amount}
              </span>
              <span className="text-ink-500">{p.status}</span>
              {p.status === 'PENDING' && (
                <button
                  type="button"
                  className={fh.btnLeaf}
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
          <section className={fh.card} aria-labelledby="reconcile-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="reconcile-heading"
                className="m-0 font-display text-base font-bold text-ink-900"
              >
                Reconcile orders vs ledger
              </h2>
              <button
                type="button"
                className={fh.btnGhost}
                onClick={() => void reconcile.refetch()}
              >
                Refresh
              </button>
            </div>
            {reconcile.isLoading && <p className="mt-2 text-ink-500">Running reconcile…</p>}
            {reconcile.isError && (
              <p className="mt-2 text-urgent-600" role="alert">
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
                <p
                  className={`mt-2 font-semibold ${reconcile.data.ok ? 'text-leaf-700' : 'text-urgent-600'}`}
                >
                  {reconcile.data.ok
                    ? 'All captured orders match ledger SALE+COMMISSION.'
                    : `${reconcile.data.issues.length} issue(s) found.`}
                </p>
                <ul className="mt-2 list-none space-y-2 p-0">
                  {reconcile.data.issues.map((i) => (
                    <li
                      key={i.orderId}
                      className="rounded-[var(--radius-card)] border border-urgent-600/20 bg-urgent-50 p-3 font-mono text-xs"
                    >
                      <div className="font-semibold text-ink-900">{i.orderId}</div>
                      <div className="text-ink-500">{i.message}</div>
                      <div className="text-ink-700">
                        expected {i.expectedPaisa} paisa · ledger {i.ledgerPaisa} paisa
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className={fh.cardLeaf} aria-labelledby="payout-batch-heading">
            <h2
              id="payout-batch-heading"
              className="m-0 font-display text-base font-bold text-ink-900"
            >
              Weekly payout batch
            </h2>
            <p className="mt-1 text-ink-500">
              Creates pending payouts from available escrow balances (server-side).
            </p>
            <button
              type="button"
              className={`mt-3 ${fh.btnLeaf}`}
              disabled={payoutBatch.isPending}
              onClick={() => {
                if (window.confirm('Run weekly payout batch now?')) payoutBatch.mutate();
              }}
            >
              {payoutBatch.isPending ? 'Running…' : 'Run payout batch'}
            </button>
          </section>

          <section className={fh.card} aria-labelledby="cod-remit-heading">
            <h2
              id="cod-remit-heading"
              className="m-0 font-display text-base font-bold text-ink-900"
            >
              Confirm COD remit
            </h2>
            <p className="mt-1 text-ink-500">Mark courier COD remittance received for an order.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="min-h-11 min-w-[16rem] flex-1 rounded-[var(--radius-card)] border border-line bg-paper px-3 text-sm text-ink-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="Order id"
                value={codOrderId}
                onChange={(e) => setCodOrderId(e.target.value)}
              />
              <button
                type="button"
                className={fh.btnCta}
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
            <p
              className="m-0 rounded-[var(--radius-card)] bg-leaf-50 px-3 py-2 text-sm font-semibold text-leaf-700"
              role="status"
            >
              {moneyMsg}
            </p>
          ) : null}
        </div>
      )}

      {tab === 'jobs' && (
        <div className="space-y-3">
          <p className="m-0 text-ink-500">
            BullMQ dead-letter queue: failed background jobs across Bangladesh ops.
          </p>
          <AdminDeadLetterPanel />
        </div>
      )}

      {tab === 'settings' && (
        <ul className="list-none space-y-2 p-0 font-mono text-xs">
          {settings.data?.map((s) => (
            <li key={s.key} className={fh.listRow}>
              <span className="text-brand-700">{s.key}</span>
              <span className="text-ink-700">: {JSON.stringify(s.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}

export default function AdminDashboard(props: Props) {
  return (
    <Island>
      <AdminDashboardInner {...props} />
    </Island>
  );
}
