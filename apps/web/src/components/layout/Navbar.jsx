import { useUiStore } from '../../stores/uiStore';

const LINKS = [
	{ href: '/#features', label: 'Features' },
	{ href: '/#how', label: 'How it works' },
	{ href: '/design', label: 'Design' },
];

export default function Navbar() {
	const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
	const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
	const toggleMobileNav = useUiStore((s) => s.toggleMobileNav);

	function close() {
		setMobileNavOpen(false);
	}

	return (
		<header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
			<div className="mx-auto flex h-16 w-[min(100%-2rem,72rem)] items-center justify-between gap-4">
				<a
					href="/"
					className="font-display text-lg font-bold tracking-tight text-ink-900 no-underline"
				>
					BookVerse
				</a>

				<nav className="hidden items-center gap-1 min-[720px]:flex" aria-label="Primary">
					{LINKS.map((link) => (
						<a
							key={link.href}
							href={link.href}
							className="rounded-full px-3 py-2 text-sm font-semibold text-ink-900 no-underline hover:bg-sand"
						>
							{link.label}
						</a>
					))}
				</nav>

				<button
					type="button"
					className="rounded-full border border-line px-3 py-2 text-sm font-semibold min-[720px]:hidden"
					aria-expanded={mobileNavOpen}
					aria-controls="site-menu"
					onClick={toggleMobileNav}
				>
					{mobileNavOpen ? 'Close' : 'Menu'}
				</button>
			</div>

			{mobileNavOpen ? (
				<nav
					id="site-menu"
					className="border-t border-line px-[max(1rem,calc((100%-72rem)/2))] py-3 min-[720px]:hidden"
					aria-label="Primary"
				>
					{LINKS.map((link) => (
						<a
							key={link.href}
							href={link.href}
							className="block rounded-lg px-3 py-3 text-base font-semibold text-ink-900 no-underline hover:bg-sand"
							onClick={close}
						>
							{link.label}
						</a>
					))}
				</nav>
			) : null}
		</header>
	);
}
