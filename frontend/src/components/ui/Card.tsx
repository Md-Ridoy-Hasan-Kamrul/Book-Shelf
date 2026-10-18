import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-line bg-paper p-4 shadow-[var(--shadow-warm)] ${className}`}
    >
      {children}
    </div>
  );
}
