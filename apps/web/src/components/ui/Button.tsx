import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'brand' | 'leaf' | 'cta' | 'ghost' | 'urgent';

const styles: Record<Variant, string> = {
  brand: 'bg-brand-600 text-paper hover:bg-brand-700',
  leaf: 'bg-leaf-700 text-paper hover:bg-leaf-600',
  cta: 'bg-cta-500 text-ink-900 hover:bg-cta-600',
  ghost: 'border border-line bg-paper text-ink-900 hover:bg-sand',
  urgent: 'bg-urgent-600 text-paper hover:opacity-90',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({ variant = 'brand', className = '', children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center rounded-[var(--radius-card)] px-4 text-sm font-semibold transition disabled:opacity-60 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
