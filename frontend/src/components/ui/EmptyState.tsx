import type { ReactNode } from 'react';

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-paper p-8 text-center">
      <p className="m-0 font-display text-lg font-bold text-ink-900">{title}</p>
      {children ? <p className="m-0 mt-2 text-ink-500">{children}</p> : null}
    </div>
  );
}
