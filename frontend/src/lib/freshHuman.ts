/**
 * PDF §২ রঙ — "ফ্রেশ ও মানবিক" ভাইব
 * Blue=trust · orange=action (max 2 CTA) · green=growth · cream/paper=calm
 * Proportion ~70% cream/white · 15% blue · 8% leaf · 5% orange
 */

export const fh = {
  tabActive:
    'cursor-pointer rounded-[var(--radius-card)] bg-brand-600 px-3 py-1.5 text-sm font-semibold text-paper',
  tabIdle:
    'cursor-pointer rounded-[var(--radius-card)] bg-sand px-3 py-1.5 text-sm font-semibold text-ink-700 hover:bg-brand-50 hover:text-brand-700',
  card: 'rounded-[var(--radius-card)] border border-line bg-paper p-3 shadow-[var(--shadow-warm)]',
  cardBrand:
    'rounded-[var(--radius-card)] border border-brand-100 bg-brand-50 p-3 shadow-[var(--shadow-warm)]',
  cardLeaf:
    'rounded-[var(--radius-card)] border border-leaf-100 bg-leaf-50 p-3 shadow-[var(--shadow-warm)]',
  listRow:
    'rounded-[var(--radius-card)] border border-line bg-paper px-3 py-2 shadow-[var(--shadow-warm)]',
  btnLeaf:
    'cursor-pointer rounded-[var(--radius-card)] bg-leaf-700 px-3 py-2 text-sm font-semibold text-paper hover:bg-leaf-600 disabled:cursor-not-allowed disabled:opacity-60',
  btnCta:
    'cursor-pointer rounded-[var(--radius-card)] bg-cta-500 px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-cta-600 disabled:cursor-not-allowed disabled:opacity-60',
  btnGhost:
    'cursor-pointer rounded-[var(--radius-card)] border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-900 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-60',
} as const;
