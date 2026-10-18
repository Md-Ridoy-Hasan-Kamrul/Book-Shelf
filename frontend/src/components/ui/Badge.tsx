import type { ReactNode } from 'react';

type Tone = 'brand' | 'leaf' | 'sun' | 'urgent' | 'premium';

const toneClass: Record<Tone, string> = {
  brand: 'bg-brand-100 text-brand-700',
  leaf: 'bg-leaf-100 text-leaf-700',
  sun: 'bg-sun-200 text-sun-800',
  urgent: 'bg-urgent-50 text-urgent-600',
  premium: 'bg-premium-50 text-premium-600',
};

export function Badge({ tone = 'brand', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
