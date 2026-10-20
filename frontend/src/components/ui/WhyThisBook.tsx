type Props = {
  why: string;
};

export function WhyThisBook({ why }: Props) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="rounded-full border border-line bg-sand px-2 py-0.5 text-xs font-semibold text-ink-700"
        aria-describedby={undefined}
      >
        Why?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-(--radius-card) border border-line bg-paper px-3 py-2 text-left text-xs text-ink-700 opacity-0 shadow-(--shadow-warm) transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {why}
      </span>
    </span>
  );
}
