type Props = { value: number; max?: number; label?: string };

export function Rating({ value, max = 5, label = 'Rating' }: Props) {
  return (
    <div
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${label}: ${value} of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? 'text-sun-800' : 'text-ink-300'} aria-hidden>
          ★
        </span>
      ))}
    </div>
  );
}
