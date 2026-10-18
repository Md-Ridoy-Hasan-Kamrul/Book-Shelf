import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { getWebEnv } from '../../env';
import { Button } from '../ui/Button';
import Island from './Island';

const conditions = ['LIKE_NEW', 'GOOD', 'FAIR', 'READABLE'] as const;

type Props = { initialIsbn?: string };

function FormInner({ initialIsbn = '' }: Props) {
  const [isbn, setIsbn] = useState(initialIsbn);
  const [condition, setCondition] = useState<(typeof conditions)[number]>('GOOD');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('');
  const [fulfillment, setFulfillment] = useState<'SHIPPING' | 'PICKUP' | 'BOTH'>('SHIPPING');
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('photos', f));
      const base = getWebEnv().PUBLIC_API_URL.replace(/\/$/, '');
      const res = await fetch(`${base}/used-listings/photos`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { photoKeys: string[] };
        message?: string;
      };
      if (!json.success || !json.data) throw new Error(json.message ?? 'Upload failed');
      return json.data.photoKeys;
    },
    onSuccess: (keys) => setPhotoKeys((prev) => [...prev, ...keys].slice(0, 8)),
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch(
        '/used-listings',
        z.object({
          id: z.string(),
          status: z.string(),
          needsModeration: z.boolean(),
        }),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isbn: isbn || undefined,
            condition,
            price: Number(price).toFixed(2),
            description,
            district,
            area,
            fulfillment,
            photoKeys,
            genreSlug: 'fiction',
          }),
        },
      ),
    onSuccess: (data) => {
      setMsg(
        data.needsModeration
          ? 'Listed — awaiting admin moderation (first listing).'
          : 'Listed and live!',
      );
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <label className="block text-sm">
        ISBN
        <input
          className="mt-1 w-full rounded border border-line px-3 py-2"
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          placeholder="Optional if title known"
        />
      </label>
      <a href="/sell/scan" className="text-sm font-semibold text-brand-700 underline">
        Scan barcode instead
      </a>
      <label className="block text-sm">
        Condition
        <select
          className="mt-1 w-full rounded border border-line px-3 py-2"
          value={condition}
          onChange={(e) => setCondition(e.target.value as (typeof conditions)[number])}
        >
          {conditions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Price (BDT)
        <input
          className="mt-1 w-full rounded border border-line px-3 py-2"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        Description
        <textarea
          className="mt-1 min-h-24 w-full rounded border border-line px-3 py-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          District
          <input
            className="mt-1 w-full rounded border border-line px-3 py-2"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Area
          <input
            className="mt-1 w-full rounded border border-line px-3 py-2"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            required
          />
        </label>
      </div>
      <label className="block text-sm">
        Fulfillment
        <select
          className="mt-1 w-full rounded border border-line px-3 py-2"
          value={fulfillment}
          onChange={(e) => setFulfillment(e.target.value as typeof fulfillment)}
        >
          <option value="SHIPPING">Shipping</option>
          <option value="PICKUP">Pickup</option>
          <option value="BOTH">Both</option>
        </select>
      </label>
      <label className="block text-sm">
        Photos (min 2)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="mt-1 block w-full text-sm"
          onChange={(e) => {
            if (e.target.files?.length) upload.mutate(e.target.files);
          }}
        />
      </label>
      <p className="text-xs text-ink-500">{photoKeys.length} photo(s) uploaded</p>
      {msg ? <p className="text-sm font-semibold text-leaf-700">{msg}</p> : null}
      {create.isError ? (
        <p className="text-sm text-urgent-600">{(create.error as Error).message}</p>
      ) : null}
      <Button type="submit" disabled={create.isPending || photoKeys.length < 2 || !price}>
        Create used listing
      </Button>
    </form>
  );
}

export default function UsedListingForm(props: Props) {
  return (
    <Island>
      <FormInner {...props} />
    </Island>
  );
}
