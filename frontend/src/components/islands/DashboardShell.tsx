import { useId, useState, type ReactNode } from 'react';

export type DashboardNavItem<T extends string> = {
  id: T;
  label: string;
  hint?: string;
};

type Props<T extends string> = {
  title: string;
  subtitle: string;
  badge: string;
  badgeClassName: string;
  regionLabel?: string;
  items: DashboardNavItem<T>[];
  activeId: T;
  onNavigate: (id: T) => void;
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Shared ops shell for Admin / Vendor / Publisher / Writer.
 * Desktop (≥960px): sticky left sidebar · Mobile: chips + optional menu.
 */
export default function DashboardShell<T extends string>({
  title,
  subtitle,
  badge,
  badgeClassName,
  regionLabel = 'Bangladesh · BDT',
  items,
  activeId,
  onNavigate,
  footer,
  children,
}: Props<T>) {
  const navId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = items.find((i) => i.id === activeId);

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper shadow-[var(--shadow-warm)]">
      <div className="flex flex-col min-[960px]:flex-row">
        <aside
          className="hidden w-60 shrink-0 flex-col border-r border-line bg-cream min-[960px]:flex"
          aria-label="Dashboard sections"
        >
          <div className="border-b border-line px-4 py-5">
            <span
              className={`inline-flex rounded-[var(--radius-card)] px-2 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase ${badgeClassName}`}
            >
              {badge}
            </span>
            <p className="m-0 mt-3 font-display text-base font-bold text-ink-900">BookVerse</p>
            <p className="m-0 mt-0.5 text-xs text-ink-500">{regionLabel}</p>
          </div>
          <nav id={navId} className="flex flex-1 flex-col gap-0.5 p-3">
            {items.map((item) => {
              const selected = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`cursor-pointer rounded-[var(--radius-card)] px-3 py-2.5 text-left text-sm font-semibold transition ${
                    selected
                      ? 'bg-brand-600 text-paper'
                      : 'text-ink-700 hover:bg-brand-50 hover:text-brand-700'
                  }`}
                  aria-current={selected ? 'page' : undefined}
                >
                  {item.label}
                  {item.hint ? (
                    <span
                      className={`mt-0.5 block text-[0.65rem] font-medium ${selected ? 'text-brand-100' : 'text-ink-500'}`}
                    >
                      {item.hint}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
          {footer ? <div className="mt-auto border-t border-line p-3">{footer}</div> : null}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper px-4 py-4 min-[640px]:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="m-0 font-display text-xl font-bold text-ink-900 min-[640px]:text-2xl">
                  {title}
                </h1>
                <span
                  className={`inline-flex rounded-[var(--radius-card)] px-2 py-0.5 text-[0.65rem] font-bold min-[960px]:hidden ${badgeClassName}`}
                >
                  {badge}
                </span>
              </div>
              <p className="m-0 mt-1 text-sm text-ink-500">{subtitle}</p>
            </div>
            <button
              type="button"
              className="cursor-pointer rounded-[var(--radius-card)] border border-line bg-sand px-3 py-2 text-sm font-semibold text-ink-900 min-[960px]:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls={`${navId}-mobile`}
            >
              {mobileOpen ? 'Hide menu' : 'Sections'}
            </button>
          </header>

          <div
            id={`${navId}-mobile`}
            className={`${mobileOpen ? 'block' : 'hidden'} border-b border-line bg-cream p-3 min-[960px]:hidden`}
          >
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
                      selected
                        ? 'bg-brand-600 text-paper'
                        : 'bg-paper text-ink-700 hover:bg-brand-50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
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
                    className={`shrink-0 cursor-pointer rounded-[var(--radius-card)] px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
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

          <div className="bg-cream/50 px-4 py-5 min-[640px]:px-6 min-[640px]:py-6">
            <p className="m-0 mb-4 text-xs font-semibold tracking-wide text-ink-500 uppercase">
              {active?.label ?? 'Section'}
            </p>
            <div className="text-sm text-ink-900">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
