import { useEffect, useState } from 'react';
import Island from './Island';

type Item = { slug: string; titleBn: string; title: string; author: string };

const FALLBACK: Item[] = [
  {
    slug: 'golpe-golpe-vocabulary',
    titleBn: 'গল্পে গল্পে Vocabulary',
    title: 'Golpe Golpe Vocabulary',
    author: 'Various',
  },
  {
    slug: 'psychology-of-money',
    titleBn: 'দ্য সাইকোলজি অফ মানি',
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
  },
  {
    slug: 'ai-prompt-engineering',
    titleBn: 'AI Prompt Engineering',
    title: 'AI Prompt Engineering',
    author: 'Kamrul Hossain',
  },
  {
    slug: 'padma-nodir-majhi',
    titleBn: 'পদ্মা নদীর মাঝি',
    title: 'Padma Nadir Majhi',
    author: 'Manik Bandopadhyay',
  },
];

function ReadOnlineStripInner() {
  const [items, setItems] = useState<Item[]>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/readable-books');
        if (!res.ok) return;
        const json: unknown = await res.json();
        if (
          cancelled ||
          !json ||
          typeof json !== 'object' ||
          !('items' in json) ||
          !Array.isArray((json as { items: unknown }).items)
        ) {
          return;
        }
        const next = (json as { items: Item[] }).items.filter(
          (b) => b && typeof b.slug === 'string' && b.slug.length > 0,
        );
        if (next.length) setItems(next);
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className="border-y border-line bg-brand-50 py-8"
      aria-labelledby="read-online-heading"
    >
      <div className="bv-container">
        <h2 id="read-online-heading" className="m-0 font-display text-2xl font-bold text-ink-900">
          অনলাইনে পড়ুন
        </h2>
        <p className="mt-1 text-sm text-ink-500">PDF বই ওয়েবসাইটে পড়ুন। ডাউনলোড নেই।</p>
        <ul className="mt-5 m-0 grid list-none gap-3 p-0 tab:grid-cols-2">
          {items.map((b) => (
            <li
              key={b.slug}
              className="flex flex-wrap items-center justify-between gap-3 rounded-(--radius-card) border border-line bg-paper p-4 shadow-(--shadow-warm)"
            >
              <div className="min-w-0">
                <p className="m-0 font-display text-lg font-bold text-ink-900">
                  {b.titleBn || b.title}
                </p>
                <p className="m-0 mt-0.5 text-sm text-ink-500">{b.author}</p>
              </div>
              <a
                href={`/books/${b.slug}/read`}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-(--radius-card) bg-cta-500 px-4 text-sm font-semibold text-ink-900 no-underline hover:bg-cta-600"
              >
                এখনই পড়ুন
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function ReadOnlineStrip() {
  return (
    <Island>
      <ReadOnlineStripInner />
    </Island>
  );
}
