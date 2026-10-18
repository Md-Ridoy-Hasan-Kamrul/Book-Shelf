import type { TextareaHTMLAttributes } from 'react';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };

export function Textarea({ label, className = '', id, ...rest }: Props) {
  const inputId = id ?? rest.name ?? 'textarea';
  return (
    <label className="block text-sm font-semibold text-ink-900" htmlFor={inputId}>
      <span className="mb-1 block">{label}</span>
      <textarea
        id={inputId}
        className={`min-h-24 w-full rounded-[var(--radius-card)] border border-line bg-paper px-3 py-2 text-ink-900 placeholder:text-ink-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 ${className}`}
        {...rest}
      />
    </label>
  );
}
