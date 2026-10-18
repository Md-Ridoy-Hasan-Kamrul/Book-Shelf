import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';
import { apiFetchPaged } from '../../lib/apiClient';
import { Button } from '../ui/Button';
import Island from './Island';

const itemSchema = z.object({
  id: z.string(),
  price: z.string(),
  condition: z.string(),
  district: z.string().nullable(),
  area: z.string().nullable(),
  book: z.object({
    slug: z.string(),
    title: z.string(),
    author: z.string(),
  }),
  sellerName: z.string(),
});

function NearMeInner() {
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('');

  const list = useQuery({
    queryKey: ['used-near-me', district, area],
    queryFn: async () => {
      const q = new URLSearchParams({ district });
      if (area) q.set('area', area);
      const { data } = await apiFetchPaged(
        `/used-listings/near-me?${q}`,
        z.object({ items: z.array(itemSchema) }),
      );
      return data.items;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          className="rounded border border-line px-3 py-2 text-sm"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="District"
        />
        <input
          className="rounded border border-line px-3 py-2 text-sm"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Area (optional)"
        />
        <Button type="button" variant="ghost" onClick={() => list.refetch()}>
          Search
        </Button>
      </div>
      {list.isLoading ? (
        <div className="h-32 animate-pulse rounded bg-sand" aria-busy="true" />
      ) : null}
      {list.isError ? (
        <p className="text-urgent-600">
          Failed.{' '}
          <button type="button" className="underline" onClick={() => list.refetch()}>
            Retry
          </button>
        </p>
      ) : null}
      {(list.data?.length ?? 0) === 0 && !list.isLoading ? (
        <p className="text-ink-500">No used books near you yet.</p>
      ) : null}
      <ul className="list-none space-y-2 p-0">
        {list.data?.map((item) => (
          <li key={item.id} className="rounded border border-line bg-paper p-3 text-sm">
            <a href={`/books/${item.book.slug}`} className="font-semibold text-brand-700">
              {item.book.title}
            </a>
            <p className="m-0 text-ink-500">
              {item.book.author} · {item.condition} · ৳{item.price}
            </p>
            <p className="m-0 text-xs text-ink-500">
              {item.district}
              {item.area ? `, ${item.area}` : ''} · {item.sellerName}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function UsedNearMe() {
  return (
    <Island>
      <NearMeInner />
    </Island>
  );
}
