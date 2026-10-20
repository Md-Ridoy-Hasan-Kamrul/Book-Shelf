import { useState } from 'react';
import { useCartStore } from '../../stores/cart';
import { useMockData } from '../../lib/mockMode';
import {
  IconCart,
  IconCommunity,
  IconDiscover,
  IconHome,
  IconProfile,
  IconShelf,
} from '../shell/navIcons';
import { ToastStack } from '../ui/Toast';
import CartDrawer from './CartDrawer';
import HeaderSearch from './HeaderSearch';
import NotificationBell from './NotificationBell';

export type SiteShellFlags = {
  usedBooks?: boolean;
};

type Props = {
  flags?: SiteShellFlags;
  pathname?: string;
  /** Signed-in reader hub; guests keep storefront `/`. */
  homeHref?: string;
};

type NavItem = {
  href: string;
  label: string;
  labelBn: string;
  match: (path: string) => boolean;
};

const DESKTOP_PRIMARY: NavItem[] = [
  {
    href: '/mood',
    label: 'Discover',
    labelBn: 'আবিষ্কার',
    match: (p) => p === '/mood' || p.startsWith('/search') || p.startsWith('/category'),
  },
  {
    href: '/feed',
    label: 'Community',
    labelBn: 'কমিউনিটি',
    match: (p) => p === '/feed' || p.startsWith('/events'),
  },
  {
    href: '/bookshelf',
    label: 'Shelf',
    labelBn: 'শেল্ফ',
    match: (p) => p.startsWith('/bookshelf'),
  },
];

/** PDF P2 bottom nav: Home · Discover · Community · Cart · Profile */
const BOTTOM_NAV: {
  id: string;
  href?: string;
  label: string;
  labelBn: string;
  cart?: boolean;
  match?: (path: string) => boolean;
  Icon: typeof IconHome;
}[] = [
  {
    id: 'home',
    href: '/',
    label: 'Home',
    labelBn: 'হোম',
    match: (p) => p === '/' || p === '/home',
    Icon: IconHome,
  },
  {
    id: 'discover',
    href: '/mood',
    label: 'Discover',
    labelBn: 'আবিষ্কার',
    match: (p) => p === '/mood' || p.startsWith('/search'),
    Icon: IconDiscover,
  },
  {
    id: 'community',
    href: '/feed',
    label: 'Community',
    labelBn: 'কমিউনিটি',
    match: (p) => p === '/feed',
    Icon: IconCommunity,
  },
  {
    id: 'cart',
    label: 'Cart',
    labelBn: 'কার্ট',
    cart: true,
    Icon: IconCart,
  },
  {
    id: 'profile',
    href: '/account',
    label: 'Profile',
    labelBn: 'প্রোফাইল',
    match: (p) => p.startsWith('/account') || p.startsWith('/login') || p.startsWith('/orders'),
    Icon: IconProfile,
  },
];

function linkClass(active: boolean) {
  return active
    ? 'text-sm font-semibold text-brand-700 no-underline'
    : 'text-sm font-semibold text-ink-700 no-underline hover:text-brand-700';
}

export default function SiteShell({ flags, pathname = '/', homeHref = '/' }: Props) {
  const usedBooks = Boolean(flags?.usedBooks);
  const count = useCartStore((s) => s.count());
  const [cartOpen, setCartOpen] = useState(false);
  const mock = useMockData();
  const path = pathname || '/';
  const brandHref = homeHref;
  const bottomNav = BOTTOM_NAV.map((item) =>
    item.id === 'home' ? { ...item, href: homeHref } : item,
  );

  return (
    <>
      {mock ? (
        <div
          className="border-b border-line bg-sand px-3 py-1.5 text-center text-xs text-ink-700"
          role="status"
        >
          Demo data ·{' '}
          <a href="/login" className="font-semibold text-brand-700 no-underline hover:underline">
            Sign in
          </a>
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 shadow-[var(--shadow-warm)] backdrop-blur">
        {/* Desktop chrome from 1020px (Laptop+): tablet/mobile use bottom nav + stacked search */}
        <div className="bv-container flex min-w-0 flex-wrap items-center gap-2 py-2.5 min-[375px]:gap-3 min-[375px]:py-3 min-[1020px]:flex-nowrap">
          <a
            href={brandHref}
            className="font-display text-lg font-bold tracking-tight text-ink-900 no-underline min-[375px]:text-xl min-[1440px]:text-[1.35rem]"
          >
            BookVerse
          </a>

          <div className="order-3 w-full min-w-0 min-[1020px]:order-none min-[1020px]:flex-1">
            <HeaderSearch />
          </div>

          <nav className="ml-auto hidden items-center gap-1 min-[1020px]:flex" aria-label="Primary">
            {DESKTOP_PRIMARY.map((item) => {
              const active = item.match(path);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`rounded-[var(--radius-card)] px-2.5 py-2 ${linkClass(active)}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {item.href === '/bookshelf' ? (
                      <IconShelf className="h-4 w-4" />
                    ) : item.href === '/mood' ? (
                      <IconDiscover className="h-4 w-4" />
                    ) : (
                      <IconCommunity className="h-4 w-4" />
                    )}
                    {item.label}
                  </span>
                </a>
              );
            })}
            {usedBooks ? (
              <a
                href="/used"
                className={`rounded-[var(--radius-card)] px-2.5 py-2 ${linkClass(path.startsWith('/used') || path.startsWith('/sell'))}`}
                aria-current={
                  path.startsWith('/used') || path.startsWith('/sell') ? 'page' : undefined
                }
              >
                Used
              </a>
            ) : null}
            <a
              href="/login"
              className={`rounded-[var(--radius-card)] px-2.5 py-2 ${linkClass(path.startsWith('/login'))}`}
            >
              Log in
            </a>
            <a
              href="/account"
              className={`rounded-[var(--radius-card)] px-2.5 py-2 ${linkClass(path.startsWith('/account'))}`}
              aria-current={path.startsWith('/account') ? 'page' : undefined}
            >
              Profile
            </a>
            <NotificationBell />
            <button
              type="button"
              className="relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-card)] border border-line bg-cream px-3 text-sm font-semibold text-ink-900 hover:border-brand-600 hover:bg-brand-50"
              onClick={() => setCartOpen(true)}
              aria-label={`Cart, ${count} items`}
            >
              <IconCart className="h-4 w-4" />
              Cart
              <span className="inline-flex min-w-5 justify-center rounded-[var(--radius-card)] bg-brand-600 px-1.5 text-xs font-bold text-paper">
                {count}
              </span>
            </button>
          </nav>

          {/* Mobile / tablet: cart + notify next to logo */}
          <div className="ml-auto flex items-center gap-2 min-[1020px]:hidden">
            <NotificationBell />
            <button
              type="button"
              className="relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[var(--radius-card)] border border-line bg-cream text-ink-900"
              onClick={() => setCartOpen(true)}
              aria-label={`Cart, ${count} items`}
            >
              <IconCart className="h-5 w-5" />
              {count > 0 ? (
                <span className="absolute -top-1 -right-1 inline-flex min-w-5 justify-center rounded-full bg-brand-600 px-1 text-[0.65rem] font-bold text-paper">
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(31_42_55/0.06)] backdrop-blur min-[1020px]:hidden"
        aria-label="Mobile"
      >
        <ul className="m-0 grid list-none grid-cols-5 gap-0 px-1 pt-1 pb-1">
          {bottomNav.map((item) => {
            const active = item.cart ? cartOpen : Boolean(item.match?.(path));
            const base =
              'flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-[var(--radius-card)] px-1 py-1 text-[0.65rem] font-semibold no-underline';
            const tone = active
              ? 'bg-brand-50 text-brand-700'
              : 'text-ink-500 hover:bg-sand hover:text-ink-900';
            const Icon = item.Icon;

            if (item.cart) {
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`relative ${base} ${tone} cursor-pointer`}
                    onClick={() => setCartOpen(true)}
                    aria-label={`${item.labelBn}, ${count} items`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.labelBn}</span>
                    {count > 0 ? (
                      <span className="absolute top-0.5 right-2 inline-flex min-w-4 justify-center rounded-full bg-brand-600 px-1 text-[0.6rem] font-bold text-paper">
                        {count > 99 ? '99+' : count}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            }

            return (
              <li key={item.id}>
                <a
                  href={item.href}
                  className={`${base} ${tone}`}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.labelBn}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <ToastStack />
    </>
  );
}
