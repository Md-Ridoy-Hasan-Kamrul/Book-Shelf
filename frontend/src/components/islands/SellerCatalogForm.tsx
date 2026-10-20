import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createBookListingSchema } from '@bookverse/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { getWebEnv } from '../../env';
import { useMockData } from '../../lib/mockMode';
import { Button } from '../ui/Button';

const GENRE_OPTIONS = [
  { slug: 'fiction', label: 'Fiction' },
  { slug: 'non-fiction', label: 'Non-fiction' },
  { slug: 'poetry', label: 'Poetry' },
  { slug: 'children', label: 'Children' },
  { slug: 'academic', label: 'Academic' },
  { slug: 'biography', label: 'Biography' },
  { slug: 'history', label: 'History' },
  { slug: 'science', label: 'Science' },
  { slug: 'religion', label: 'Religion' },
  { slug: 'business', label: 'Business' },
  { slug: 'comics', label: 'Comics' },
  { slug: 'self-help', label: 'Self-help' },
] as const;

const createdSchema = z.object({
  book: z.object({ id: z.string(), slug: z.string(), title: z.string() }),
  listing: z.object({ id: z.string(), price: z.unknown(), stock: z.number() }),
});

const field =
  'mt-1 w-full min-h-10 rounded-[var(--radius-card)] border border-line bg-paper px-3 text-sm text-ink-900';

export default function SellerCatalogForm() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [genreSlug, setGenreSlug] = useState<string>('fiction');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [bookId, setBookId] = useState<string | null>(null);
  const [copyright, setCopyright] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const body = createBookListingSchema.parse({
        title,
        titleBn: titleBn || title,
        author,
        description,
        genreSlug,
        language: 'bn',
        price: Number(price).toFixed(2),
        stock: Number(stock),
        condition: 'NEW',
        moodTags: [],
      });
      if (useMockData()) {
        return {
          book: { id: `mock-new-${Date.now()}`, slug: 'mock-new', title: body.title },
          listing: { id: `mock-listing-new`, price: body.price, stock: body.stock },
        };
      }
      return apiFetch('/seller/books', createdSchema, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    onSuccess: (data) => {
      setBookId(data.book.id);
      setMsg(
        useMockData()
          ? `Mock created “${data.book.title}” (no backend). Cover/look-inside are no-ops.`
          : `Created “${data.book.title}”: you can upload cover / look-inside below.`,
      );
      setErr(null);
      void qc.invalidateQueries({ queryKey: ['seller', 'listings'] });
    },
    onError: (e: Error) => {
      setErr(e.message);
      setMsg(null);
    },
  });

  const uploadCover = useMutation({
    mutationFn: async (file: File) => {
      if (!bookId) throw new Error('Create a book first');
      if (useMockData()) return;
      const fd = new FormData();
      fd.append('cover', file);
      const base = getWebEnv().PUBLIC_API_URL.replace(/\/$/, '');
      const res = await fetch(`${base}/seller/books/${bookId}/cover`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const json = (await res.json()) as { success: boolean; message?: string };
      if (!json.success) throw new Error(json.message ?? 'Cover upload failed');
    },
    onSuccess: () => setMsg(useMockData() ? 'Mock cover accepted.' : 'Cover uploaded.'),
    onError: (e: Error) => setErr(e.message),
  });

  const uploadLookInside = useMutation({
    mutationFn: async (files: FileList) => {
      if (!bookId) throw new Error('Create a book first');
      if (!copyright) throw new Error('Confirm copyright before uploading look-inside pages');
      if (useMockData()) return;
      const fd = new FormData();
      fd.append('copyrightConfirmed', 'true');
      Array.from(files).forEach((f) => fd.append('pages', f));
      const base = getWebEnv().PUBLIC_API_URL.replace(/\/$/, '');
      const res = await fetch(`${base}/seller/books/${bookId}/look-inside`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const json = (await res.json()) as { success: boolean; message?: string };
      if (!json.success) throw new Error(json.message ?? 'Look-inside upload failed');
    },
    onSuccess: () =>
      setMsg(useMockData() ? 'Mock look-inside accepted.' : 'Look-inside pages submitted.'),
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="mb-6 space-y-4 rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <h3 className="m-0 font-display text-lg font-bold text-ink-900">Add book listing</h3>
      <form
        className="grid gap-3 min-[720px]:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <label className="text-sm font-semibold text-ink-900">
          Title (EN)
          <input
            className={field}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className="text-sm font-semibold text-ink-900">
          Title (BN)
          <input className={field} value={titleBn} onChange={(e) => setTitleBn(e.target.value)} />
        </label>
        <label className="text-sm font-semibold text-ink-900">
          Author
          <input
            className={field}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />
        </label>
        <label className="text-sm font-semibold text-ink-900">
          Genre
          <select
            className={field}
            value={genreSlug}
            onChange={(e) => setGenreSlug(e.target.value)}
          >
            {GENRE_OPTIONS.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-ink-900 min-[720px]:col-span-2">
          Description (min 20 chars)
          <textarea
            className={`${field} min-h-24 py-2`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={20}
          />
        </label>
        <label className="text-sm font-semibold text-ink-900">
          Price (BDT)
          <input
            className={field}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>
        <label className="text-sm font-semibold text-ink-900">
          Stock
          <input
            className={field}
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
        </label>
        <div className="min-[720px]:col-span-2">
          <Button type="submit" variant="brand" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create book + listing'}
          </Button>
        </div>
      </form>

      {bookId ? (
        <div className="space-y-3 border-t border-line pt-4">
          <p className="m-0 text-xs text-ink-500">Book id: {bookId}</p>
          <label className="block text-sm font-semibold text-ink-900">
            Cover image
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadCover.mutate(f);
              }}
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={copyright}
              onChange={(e) => setCopyright(e.target.checked)}
              className="mt-1"
            />
            I confirm I have rights to upload look-inside preview pages.
          </label>
          <label className="block text-sm font-semibold text-ink-900">
            Look-inside pages (max 10)
            <input
              type="file"
              accept="image/*"
              multiple
              className="mt-1 block w-full text-sm"
              disabled={!copyright}
              onChange={(e) => {
                const files = e.target.files;
                if (files?.length) uploadLookInside.mutate(files);
              }}
            />
          </label>
        </div>
      ) : null}

      {msg ? <p className="m-0 text-sm text-leaf-700">{msg}</p> : null}
      {err ? (
        <p className="m-0 text-sm text-urgent-600" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
