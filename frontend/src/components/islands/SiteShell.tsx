import { useState } from 'react';
import { useCartStore } from '../../stores/cart';
import { ToastStack } from '../ui/Toast';
import CartDrawer from './CartDrawer';
import NotificationBell from './NotificationBell';

const bottomLinks = [
  { href: '/', label: 'Home' },
  { href: '/#features', label: 'Discover' },
  { href: '/feed', label: 'Community' },
  { href: '/checkout', label: 'Cart' },
  { href: '/design', label: 'Profile' },
];

export default function SiteShell() {
  const count = useCartStore((s) => s.count());
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex w-[min(100%-2rem,72rem)] flex-col gap-3 py-3 min-[720px]:flex-row min-[720px]:items-center">
          <a href="/" className="font-display text-lg font-bold text-ink-900 no-underline">
            BookVerse
          </a>
          <form className="min-[720px]:flex-1" role="search" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="site-search" className="sr-only">
              Search
            </label>
            <input
              id="site-search"
              name="q"
              type="search"
              placeholder="বই, লেখক, ISBN…"
              className="min-h-11 w-full rounded-[var(--radius-card)] border border-line bg-paper px-3 text-ink-900 placeholder:text-ink-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </form>
          <nav className="hidden items-center gap-3 min-[720px]:flex" aria-label="Primary">
            <a
              href="/design"
              className="text-sm font-semibold text-brand-700 no-underline hover:underline"
            >
              Design
            </a>
            <NotificationBell />
            <button
              type="button"
              className="relative rounded-full border border-line bg-cream px-3 py-2 text-sm font-semibold"
              onClick={() => setCartOpen(true)}
            >
              Cart
              <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-brand-600 px-1.5 text-xs text-paper">
                {count}
              </span>
            </button>
          </nav>
        </div>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] min-[720px]:hidden"
        aria-label="Mobile"
      >
        <ul className="m-0 grid list-none grid-cols-5 gap-1 p-2">
          {bottomLinks.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="flex flex-col items-center rounded-lg px-1 py-2 text-[0.65rem] font-semibold text-ink-700 no-underline hover:bg-sand"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <ToastStack />
    </>
  );
}
