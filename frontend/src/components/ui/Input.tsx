import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Input({ label, className = '', id, ...rest }: Props) {
  const inputId = id ?? rest.name ?? label.replace(/\s+/g, '-').toLowerCase();
  return (
    <label className="block text-sm font-semibold text-ink-900" htmlFor={inputId}>
      <span className="mb-1 block">{label}</span>
      <input
        id={inputId}
        className={`min-h-11 w-full rounded-(--radius-card) border border-line bg-paper px-3 text-ink-900 placeholder:text-ink-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 ${className}`}
        {...rest}
      />
    </label>
  );
}
