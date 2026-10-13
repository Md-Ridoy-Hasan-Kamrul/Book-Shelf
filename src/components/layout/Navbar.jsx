import { useState } from 'react';

const LINKS = [
	{ href: '/#features', label: 'Features' },
	{ href: '/#how', label: 'How it works' },
];

export default function Navbar() {
	const [open, setOpen] = useState(false);

	function close() {
		setOpen(false);
	}

	return (
		<header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
			<div className="mx-auto flex h-16 w-[min(100%-2rem,72rem)] items-center justify-between gap-4">
				<a href="/" className="font-display text-lg font-bold tracking-tight text-ink no-underline">
					Astro React
				</a>

				<nav className="hidden items-center gap-1 min-[720px]:flex" aria-label="Primary">
					{LINKS.map((link) => (
						<a
							key={link.href}
							href={link.href}
							className="rounded-full px-3 py-2 text-sm font-semibold text-ink no-underline hover:bg-mist"
						>
							{link.label}
						</a>
					))}
				</nav>

				<button
					type="button"
					className="rounded-full border border-line px-3 py-2 text-sm font-semibold min-[720px]:hidden"
					aria-expanded={open}
					aria-controls="site-menu"
					onClick={() => setOpen((value) => !value)}
				>
					{open ? 'Close' : 'Menu'}
				</button>
			</div>

			{open ? (
				<nav
					id="site-menu"
					className="border-t border-line px-[max(1rem,calc((100%-72rem)/2))] py-3 min-[720px]:hidden"
					aria-label="Primary"
				>
					{LINKS.map((link) => (
						<a
							key={link.href}
							href={link.href}
							className="block rounded-lg px-3 py-3 text-base font-semibold text-ink no-underline hover:bg-mist"
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
