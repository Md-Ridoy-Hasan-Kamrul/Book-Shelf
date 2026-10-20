import { useId, useState, type ReactNode } from 'react';
import { authClient } from '../../lib/authClient';
import { useMockData } from '../../lib/mockMode';

export type DashboardNavItem<T extends string> = {
  id: T;
  label: string;
  hint?: string;
  badge?: string;
};

type Props<T extends string> = {
  title: string;
  subtitle: string;
  badge: string;
  badgeClassName: string;
  regionLabel?: string;
  userName?: string;
  userEmail?: string;
  items: DashboardNavItem<T>[];
  activeId: T;
  onNavigate: (id: T) => void;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

async function logout() {
  if (useMockData()) {
    window.location.href = '/mock-logout';
    return;
  }
  await authClient.signOut();
  window.location.href = '/login';
}

/**
 * Ops shell: left sidebar only (no top navbar).
 * Account role + Logout live in the sidebar.
 */
export default function DashboardShell<T extends string>({
  title,
  subtitle,
  badge,
  badgeClassName,
  regionLabel = 'Bangladesh · BDT',
  userName,
  userEmail,
  items,
  activeId,
  onNavigate,
  headerActions,
  footer,
  children,
}: Props<T>) {
  const navId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const initials = (userName ?? badge)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  function onLogout() {
    setLoggingOut(true);
    void logout().catch(() => {
      setLoggingOut(false);
      window.location.href = '/login';
    });
  }

  const accountBlock = (
    <div className="rounded-[var(--radius-card)] border border-line bg-cream p-3">
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-paper"
          aria-hidden
        >
          {initials || 'BV'}
        </span>
        <div className="min-w-0">
          <p className="m-0 truncate text-sm font-semibold text-ink-900">{userName ?? badge}</p>
          {userEmail ? (
            <p className="m-0 truncate text-[0.65rem] text-ink-500">{userEmail}</p>
          ) : null}
        </div>
      </div>
      <span
        className={`mt-2 inline-flex rounded-[var(--radius-card)] px-2 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase ${badgeClassName}`}
      >
        {badge}
      </span>
    </div>
  );

  const generalNav = (
    <div className="space-y-1">
      <p className="m-0 px-1 pb-1 text-[0.65rem] font-bold tracking-wide text-ink-300 uppercase">
        General
      </p>
      <a
        href="/"
        className="flex cursor-pointer items-center rounded-[var(--radius-card)] px-3 py-2.5 text-sm font-semibold text-ink-700 no-underline hover:bg-sand hover:text-ink-900"
      >
        Storefront
      </a>
      <button
        type="button"
        onClick={onLogout}
        disabled={loggingOut}
        className="flex w-full cursor-pointer items-center rounded-[var(--radius-card)] px-3 py-2.5 text-left text-sm font-semibold text-urgent-600 hover:bg-urgent-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loggingOut ? 'Logging out…' : 'Logout'}
      </button>
      {footer}
    </div>
  );

  return (
    <div className="min-h-dvh bg-sand">
      <div className="flex min-h-dvh flex-col min-[960px]:flex-row">
        <aside
          className="hidden w-56 shrink-0 flex-col border-r border-line bg-paper min-[960px]:flex min-[1100px]:w-60"
          aria-label="Dashboard sections"
        >
          <div className="px-4 pt-5 pb-4">
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-card)] bg-brand-600 font-display text-sm font-bold text-paper"
                aria-hidden
              >
                BV
              </span>
              <div className="min-w-0">
                <p className="m-0 font-display text-base font-bold text-ink-900">BookVerse</p>
                <p className="m-0 truncate text-[0.65rem] text-ink-500">{regionLabel}</p>
              </div>
            </div>
          </div>

          <div className="px-3 pb-3">{accountBlock}</div>

          <p className="m-0 px-4 pb-1 text-[0.65rem] font-bold tracking-wide text-ink-300 uppercase">
            Menu
          </p>
          <nav id={navId} className="flex flex-1 flex-col gap-0.5 px-2 pb-3">
            {items.map((item) => {
              const selected = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`relative flex cursor-pointer items-center gap-2 rounded-[var(--radius-card)] px-3 py-2.5 text-left text-sm font-semibold transition ${
                    selected
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-700 hover:bg-sand hover:text-ink-900'
                  }`}
                  aria-current={selected ? 'page' : undefined}
                >
                  {selected ? (
                    <span
                      className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r bg-brand-600"
                      aria-hidden
                    />
                  ) : null}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[0.6rem] font-bold text-paper">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-line p-3">{generalNav}</div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile-only: menu toggle + chips (no desktop top navbar) */}
          <div className="border-b border-line bg-paper px-3 py-3 min-[960px]:hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 truncate font-display text-base font-bold text-ink-900">
                  BookVerse
                </p>
                <span
                  className={`inline-flex rounded-[var(--radius-card)] px-2 py-0.5 text-[0.65rem] font-bold uppercase ${badgeClassName}`}
                >
                  {badge}
                </span>
              </div>
              <button
                type="button"
                className="cursor-pointer rounded-[var(--radius-card)] border border-line bg-sand px-3 py-2 text-sm font-semibold text-ink-900"
                onClick={() => setMobileOpen((v) => !v)}
                aria-expanded={mobileOpen}
                aria-controls={`${navId}-mobile`}
              >
                {mobileOpen ? 'Hide' : 'Menu'}
              </button>
            </div>
          </div>

          <div
            id={`${navId}-mobile`}
            className={`${mobileOpen ? 'block' : 'hidden'} border-b border-line bg-paper p-3 min-[960px]:hidden`}
          >
            <div className="mb-3">{accountBlock}</div>
            <nav className="flex flex-col gap-1" aria-label="Dashboard sections">
              {items.map((item) => {
                const selected = item.id === activeId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileOpen(false);
                    }}
                    className={`cursor-pointer rounded-[var(--radius-card)] px-3 py-2.5 text-left text-sm font-semibold ${
                      selected ? 'bg-brand-600 text-paper' : 'bg-sand text-ink-700'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="mt-3 border-t border-line pt-3">{generalNav}</div>
          </div>

          <div
            className="border-b border-line bg-paper px-3 py-2 min-[960px]:hidden"
            role="presentation"
          >
            <div className="-mx-1 flex max-w-full gap-1 overflow-x-auto pb-1">
              {items.map((item) => {
                const selected = item.id === activeId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                      selected
                        ? 'bg-brand-600 text-paper'
                        : 'bg-sand text-ink-700 hover:bg-brand-50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 bg-sand/80 px-3 py-5 min-[640px]:px-5 min-[640px]:py-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="m-0 font-display text-2xl font-bold text-ink-900 min-[640px]:text-3xl">
                  {title}
                </h1>
                <p className="m-0 mt-1 max-w-xl text-sm text-ink-500">{subtitle}</p>
              </div>
              {headerActions ? <div className="flex flex-wrap gap-2">{headerActions}</div> : null}
            </div>
            <div className="text-sm text-ink-900">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Highlight + secondary KPI tiles. */
export function DashStat({
  label,
  value,
  hint,
  tone = 'paper',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'paper' | 'brand' | 'leaf';
}) {
  const shell =
    tone === 'brand'
      ? 'border-brand-600 bg-brand-600 text-paper'
      : tone === 'leaf'
        ? 'border-leaf-100 bg-leaf-50 text-ink-900'
        : 'border-line bg-paper text-ink-900';
  const muted = tone === 'brand' ? 'text-brand-100' : 'text-ink-500';
  const strong =
    tone === 'brand' ? 'text-paper' : tone === 'leaf' ? 'text-leaf-700' : 'text-ink-900';

  return (
    <div
      className={`flex min-h-[6.5rem] flex-col justify-between rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-warm)] ${shell}`}
    >
      <p className={`m-0 text-xs font-semibold ${muted}`}>{label}</p>
      <p className={`m-0 font-display text-2xl font-bold ${strong}`}>{value}</p>
      {hint ? <p className={`m-0 text-[0.65rem] font-medium ${muted}`}>{hint}</p> : null}
    </div>
  );
}

export function DashPanel({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[var(--radius-card)] border border-line bg-paper p-4 shadow-[var(--shadow-warm)] ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 font-display text-base font-bold text-ink-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
