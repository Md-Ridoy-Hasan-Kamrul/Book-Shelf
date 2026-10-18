import { useEffect, useMemo, useState } from 'react';
import { suggestSearch } from '../../lib/catalogApi';

type Props = { initialQ?: string };

export default function SearchSuggest({ initialQ = '' }: Props) {
  const [q, setQ] = useState(initialQ);
  const [debounced, setDebounced] = useState(initialQ);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Awaited<ReturnType<typeof suggestSearch>> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (debounced.length < 2) {
      setItems(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    suggestSearch(debounced)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const flat = useMemo(() => {
    if (!items) return [];
    return [
      ...items.books.map((b) => ({
        kind: 'book' as const,
        href: `/books/${b.slug}`,
        label: b.title,
        sub: b.author,
      })),
      ...items.authors.map((a) => ({
        kind: 'author' as const,
        href: `/author/${encodeURIComponent(a.name)}`,
        label: a.name,
        sub: `${a.count} books`,
      })),
      ...items.publishers.map((p) => ({
        kind: 'publisher' as const,
        href: `/publisher/${p.slug}`,
        label: p.name,
        sub: 'Publisher',
      })),
    ];
  }, [items]);

  return (
    <div className="relative">
      <form action="/search" method="get" role="search" className="flex gap-2">
        <input
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="বই, লেখক, প্রকাশক…"
          className="min-h-11 flex-1 rounded-[var(--radius-card)] border border-line bg-paper px-3 text-ink-900"
          autoComplete="off"
        />
        <button
          type="submit"
          className="min-h-11 rounded-[var(--radius-card)] bg-brand-600 px-4 text-sm font-semibold text-paper"
        >
          Search
        </button>
      </form>
      {open && debounced.length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-[var(--radius-card)] border border-line bg-paper p-2 shadow-[var(--shadow-warm)]">
          {loading && <li className="px-2 py-2 text-sm text-ink-500">Loading…</li>}
          {!loading && flat.length === 0 && (
            <li className="px-2 py-2 text-sm text-ink-500">No suggestions</li>
          )}
          {flat.map((row) => (
            <li key={`${row.kind}-${row.href}`}>
              <a
                href={row.href}
                className="block rounded-lg px-2 py-2 text-sm no-underline hover:bg-sand"
                onClick={() => setOpen(false)}
              >
                <span className="font-semibold text-ink-900">{row.label}</span>
                <span className="ml-2 text-ink-500">{row.sub}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
