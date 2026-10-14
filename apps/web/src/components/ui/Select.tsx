import type { SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: { value: string; label: string }[];
};

export function Select({ label, options, className = '', id, ...rest }: Props) {
  const selectId = id ?? rest.name ?? 'select';
  return (
    <label className="block text-sm font-semibold text-ink-900" htmlFor={selectId}>
      <span className="mb-1 block">{label}</span>
      <select
        id={selectId}
        className={`min-h-11 w-full rounded-[var(--radius-card)] border border-line bg-paper px-3 text-ink-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 ${className}`}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
