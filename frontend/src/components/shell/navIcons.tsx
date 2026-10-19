/** Lightweight inline icons — no icon-package dependency (AGENTS: prefer free/OSS). */
import type { ReactNode } from 'react';

type IconProps = { className?: string; title?: string };

function Svg({ className = 'h-5 w-5', title, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function IconHome(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </Svg>
  );
}

export function IconDiscover(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m10.5 10.5 4-1.5-1.5 4-4 1.5 1.5-4Z" />
    </Svg>
  );
}

export function IconCommunity(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3.5" />
      <path d="M22 21v-2a3.5 3.5 0 0 0-2.5-3.35" />
      <path d="M16 3.65a3.5 3.5 0 0 1 0 6.7" />
    </Svg>
  );
}

export function IconCart(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 7h14l-1.4 8.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.7L5.2 4H3" />
      <circle cx="9.5" cy="20" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="20" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconProfile(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  );
}

export function IconShelf(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 19h16" />
      <path d="M6 19V7.5A1.5 1.5 0 0 1 7.5 6h1A1.5 1.5 0 0 1 10 7.5V19" />
      <path d="M12 19V6.5A1.5 1.5 0 0 1 13.5 5h1A1.5 1.5 0 0 1 16 6.5V19" />
      <path d="M18 19v-8.5A1.5 1.5 0 0 1 19.5 9H20" />
    </Svg>
  );
}
