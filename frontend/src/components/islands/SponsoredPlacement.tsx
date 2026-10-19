import { useEffect, useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';

const itemSchema = z.object({
  campaignId: z.string(),
  name: z.string(),
  bookId: z.string().nullable(),
  listingId: z.string().nullable(),
  trackingId: z.string(),
});

type Item = z.infer<typeof itemSchema>;

async function track(trackingId: string, kind: 'IMPRESSION' | 'CLICK' | 'ADD_TO_CART') {
  await apiFetch(
    '/publisher/track',
    z.object({ id: z.string(), kind: z.string(), campaignId: z.string() }),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingId, kind }),
    },
  ).catch(() => undefined);
}

export default function SponsoredPlacement({ genreId }: { genreId?: string }) {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const q = genreId ? `?genreId=${encodeURIComponent(genreId)}` : '';
    void apiFetch(`/publisher/sponsored${q}`, z.array(itemSchema))
      .then((data) => {
        setItems(data.slice(0, 3));
        for (const item of data.slice(0, 3)) {
          void track(item.trackingId, 'IMPRESSION');
        }
      })
      .catch(() => setItems([]));
  }, [genreId]);

  if (items.length === 0) return null;

  return (
    <aside
      className="mt-6 rounded-[var(--radius-card)] border border-line bg-brand-100/40 p-4"
      aria-label="Sponsored"
    >
      <p className="m-0 text-xs font-bold tracking-wide text-brand-700 uppercase">Sponsored</p>
      <ul className="mt-2 list-none space-y-2 p-0">
        {items.map((item) => (
          <li key={item.campaignId}>
            <button
              type="button"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-left text-sm font-semibold text-ink-900 hover:bg-sand"
              onClick={() => {
                void track(item.trackingId, 'CLICK');
                try {
                  sessionStorage.setItem('bv_tracking', item.trackingId);
                } catch {
                  /* ignore */
                }
              }}
            >
              {item.name}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
