type Props = { amount: number; localeDigits?: boolean };

export function Price({ amount, localeDigits = false }: Props) {
  const formatted = new Intl.NumberFormat(localeDigits ? 'bn-BD' : 'en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(amount);
  return <span className="font-semibold text-ink-900">{formatted}</span>;
}
