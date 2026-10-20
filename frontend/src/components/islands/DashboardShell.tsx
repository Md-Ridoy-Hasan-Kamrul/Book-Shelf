import { useEffect, useId, useState, type ReactNode, type TransitionEvent } from 'react';
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

const navBtn =
  'relative flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition';
const navIdle = 'text-ink-700 hover:bg-sand hover:text-ink-900';
const navActive = 'bg-brand-50 font-semibold text-brand-700';

/**
 * Docked sidebar ≥1280px.
 * Below that (Laptop 1020 · Tablet 768 · Mobile 425/375/320): slide-over sidebar modal.
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
  /** Keep in DOM while animating out. */
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerShown, setDrawerShown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const displayName = userName ?? badge;
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  function openDrawer() {
    setDrawerMounted(true);
    // Double rAF so the browser paints the closed state before transitioning.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawerShown(true));
    });
  }

  function closeDrawer() {
    setDrawerShown(false);
  }

  function onDrawerTransitionEnd(e: TransitionEvent<HTMLElement>) {
    if (e.propertyName !== 'transform') return;
    if (!drawerShown) setDrawerMounted(false);
  }

  function onLogout() {
    setLoggingOut(true);
    void logout().catch(() => {
      setLoggingOut(false);
      window.location.href = '/login';
    });
  }

  useEffect(() => {
    if (!drawerMounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    if (drawerShown) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerMounted, drawerShown]);

  const brandBlock = (
    <a
      href="/"
      className="flex items-center gap-3 border-b border-line px-4 py-4 no-underline hover:bg-sand/60"
      title="Open storefront"
    >
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 font-display text-sm font-bold text-paper"
        aria-hidden
      >
        BV
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="m-0 font-display text-[0.95rem] font-bold text-ink-900">BookVerse</p>
          <span
            className={`inline-flex rounded-md px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide uppercase ${badgeClassName}`}
          >
            {badge}
          </span>
        </div>
        <p className="m-0 mt-0.5 truncate text-[0.65rem] text-ink-500">{regionLabel}</p>
      </div>
    </a>
  );

  const menuNav = (
    <nav className="flex flex-col gap-0.5" aria-label="Dashboard sections">
      {items.map((item) => {
        const selected = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onNavigate(item.id);
              closeDrawer();
            }}
            className={`${navBtn} ${selected ? navActive : navIdle}`}
            aria-current={selected ? 'page' : undefined}
          >
            {selected ? (
              <span
                className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-600"
                aria-hidden
              />
            ) : null}
            <span className="min-w-0 flex-1 truncate pl-0.5">{item.label}</span>
            {item.badge ? (
              <span className="inline-flex min-w-5 justify-center rounded-md bg-brand-600 px-1.5 py-0.5 text-[0.65rem] font-bold text-paper">
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );

  const bottomBlock = (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5 px-1">
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[0.7rem] font-bold text-paper"
          aria-hidden
        >
          {initials || 'BV'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-sm font-semibold text-ink-900">{displayName}</p>
          {userEmail ? (
            <p className="m-0 truncate text-[0.65rem] leading-tight text-ink-500">{userEmail}</p>
          ) : null}
        </div>
      </div>
      {footer ? <div className="flex flex-col gap-0.5">{footer}</div> : null}
      <button
        type="button"
        onClick={onLogout}
        disabled={loggingOut}
        className={`${navBtn} text-urgent-600 hover:bg-urgent-50 disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loggingOut ? 'Logging out…' : 'Logout'}
      </button>
    </div>
  );

  const sidebarInner = (
    <>
      {brandBlock}
      <div className="motion-safe:scroll-smooth flex-1 overflow-y-auto overscroll-contain px-2.5 py-4">
        <p className="m-0 mb-1.5 px-2 text-[0.65rem] font-semibold tracking-wider text-ink-300 uppercase">
          Menu
        </p>
        {menuNav}
      </div>
      <div className="border-t border-line px-2.5 py-3">{bottomBlock}</div>
    </>
  );

  return (
    <div className="min-h-dvh bg-sand">
      <div className="flex min-h-dvh flex-col min-[1280px]:flex-row">
        {/* Docked sidebar: wide desktop only */}
        <aside
          className="hidden w-[15.5rem] shrink-0 flex-col border-r border-line bg-paper min-[1280px]:flex"
          aria-label="Dashboard"
        >
          {sidebarInner}
        </aside>

        {/* Drawer modal: ≤1279px. CSS-only motion (no animation libs). */}
        {drawerMounted ? (
          <div className="fixed inset-0 z-50 min-[1280px]:hidden" role="presentation">
            <button
              type="button"
              className={`absolute inset-0 cursor-pointer border-0 bg-ink-900/40 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                drawerShown ? 'opacity-100' : 'opacity-0'
              }`}
              aria-label="Close menu"
              onClick={closeDrawer}
            />
            <aside
              id={navId}
              role="dialog"
              aria-modal="true"
              aria-label="Dashboard menu"
              onTransitionEnd={onDrawerTransitionEnd}
              className={`absolute top-0 left-0 flex h-full w-[min(100%-2.5rem,17.5rem)] max-w-[17.5rem] flex-col bg-paper shadow-[var(--shadow-warm)] will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none min-[375px]:w-[min(100%-3rem,18rem)] min-[768px]:w-[18rem] ${
                drawerShown ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <div className="flex items-center justify-end border-b border-line px-2 py-2">
                <button
                  type="button"
                  className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-line bg-sand text-ink-900 hover:bg-brand-50"
                  onClick={closeDrawer}
                  aria-label="Close menu"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">{sidebarInner}</div>
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Compact top bar when drawer mode */}
          <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-line bg-paper px-3 py-3 min-[425px]:px-4 min-[1280px]:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-paper"
                aria-hidden
              >
                BV
              </span>
              <div className="min-w-0">
                <p className="m-0 truncate font-display text-sm font-bold text-ink-900">
                  BookVerse
                </p>
                <span
                  className={`inline-flex rounded-md px-1.5 py-0.5 text-[0.6rem] font-bold uppercase ${badgeClassName}`}
                >
                  {badge}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line bg-sand text-ink-900 hover:bg-brand-50"
              onClick={openDrawer}
              aria-expanded={drawerShown}
              aria-controls={navId}
              aria-label="Open menu"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </header>

          <div className="flex-1 px-3 py-5 min-[375px]:px-4 min-[640px]:px-6 min-[640px]:py-7 min-[1020px]:px-8">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3 min-[768px]:mb-6">
              <div className="min-w-0">
                <h1 className="m-0 font-display text-xl font-bold tracking-tight text-ink-900 min-[375px]:text-2xl min-[768px]:text-[1.75rem]">
                  {title}
                </h1>
                <p className="m-0 mt-1.5 max-w-lg text-sm leading-relaxed text-ink-500">
                  {subtitle}
                </p>
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
      className={`flex min-h-[6.25rem] flex-col justify-between rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-warm)] ${shell}`}
    >
      <p className={`m-0 text-xs font-semibold ${muted}`}>{label}</p>
      <p className={`m-0 font-display text-2xl font-bold tracking-tight ${strong}`}>{value}</p>
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
      className={`rounded-[var(--radius-card)] border border-line bg-paper p-4 shadow-[var(--shadow-warm)] min-[640px]:p-5 ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 font-display text-base font-bold text-ink-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
