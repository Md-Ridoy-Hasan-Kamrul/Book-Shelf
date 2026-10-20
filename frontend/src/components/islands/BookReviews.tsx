import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { Button } from '../ui/Button';
import Island from './Island';

type Props = { bookId: string };

const reviewSchema = z.object({
  id: z.string(),
  rating: z.number(),
  body: z.string().nullable(),
  hasSpoiler: z.boolean(),
  helpfulCount: z.number(),
  isVerifiedBuyer: z.boolean(),
  authorName: z.string(),
  createdAt: z.string(),
});

function ReviewsInner({ bookId }: Props) {
  const qc = useQueryClient();
  const [spoilerRevealed, setSpoilerRevealed] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState({ rating: 5, body: '', hasSpoiler: false });

  const reviews = useQuery({
    queryKey: ['reviews', bookId],
    queryFn: () =>
      apiFetch(
        `/reviews/books/${bookId}`,
        z.object({
          verified: z.array(reviewSchema),
          community: z.array(reviewSchema),
        }),
      ),
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch(`/reviews/books/${bookId}`, z.object({ id: z.string() }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['reviews', bookId] }),
  });

  const helpful = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/reviews/${id}/helpful`, z.object({ helpful: z.boolean() }), { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['reviews', bookId] }),
  });

  const report = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/reviews/${id}/report`, z.object({ reported: z.boolean() }), {
        method: 'POST',
        body: JSON.stringify({ reason: 'Reported from book page: needs moderation review.' }),
      }),
  });

  const renderReview = (r: z.infer<typeof reviewSchema>) => {
    const hidden = r.hasSpoiler && !spoilerRevealed[r.id];
    return (
      <li key={r.id} className="rounded-[var(--radius-card)] border border-line p-3 text-sm">
        <div className="flex justify-between">
          <strong>
            {r.authorName}
            {r.isVerifiedBuyer ? (
              <span className="ml-2 rounded-full bg-leaf-100 px-2 py-0.5 text-xs text-leaf-700">
                Verified buyer
              </span>
            ) : null}
          </strong>
          <span>{'★'.repeat(r.rating)}</span>
        </div>
        {hidden ? (
          <button
            type="button"
            className="mt-2 rounded bg-sand px-2 py-1 text-xs font-semibold blur-sm"
            onClick={() => setSpoilerRevealed((s) => ({ ...s, [r.id]: true }))}
          >
            Spoiler: tap to reveal
          </button>
        ) : (
          <p className="mt-2 text-ink-700">{r.body}</p>
        )}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="text-xs font-semibold text-brand-700"
            onClick={() => helpful.mutate(r.id)}
          >
            Helpful ({r.helpfulCount})
          </button>
          <button
            type="button"
            className="text-xs text-ink-500"
            onClick={() => report.mutate(r.id)}
          >
            Report
          </button>
        </div>
      </li>
    );
  };

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-ink-900">Reviews</h2>
      {reviews.isLoading && <p className="text-ink-500">Loading reviews…</p>}
      {reviews.isError && (
        <p className="text-urgent-600">
          Could not load reviews.{' '}
          <button type="button" onClick={() => reviews.refetch()}>
            Retry
          </button>
        </p>
      )}
      {reviews.data && (
        <>
          {reviews.data.verified.length > 0 && (
            <>
              <h3 className="mt-4 font-semibold text-ink-900">Verified buyers</h3>
              <ul className="list-none space-y-3 p-0">{reviews.data.verified.map(renderReview)}</ul>
            </>
          )}
          {reviews.data.community.length > 0 && (
            <>
              <h3 className="mt-4 font-semibold text-ink-900">Community</h3>
              <ul className="list-none space-y-3 p-0">
                {reviews.data.community.map(renderReview)}
              </ul>
            </>
          )}
        </>
      )}
      <form
        className="mt-6 space-y-2 rounded-[var(--radius-card)] border border-line bg-paper p-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h3 className="font-semibold">Write a review</h3>
        <label className="block text-sm">
          Rating
          <select
            className="ml-2 rounded border border-line"
            value={draft.rating}
            onChange={(e) => setDraft((d) => ({ ...d, rating: Number(e.target.value) }))}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <textarea
          className="min-h-24 w-full rounded border border-line p-2 text-sm"
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          placeholder="At least 20 characters…"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.hasSpoiler}
            onChange={(e) => setDraft((d) => ({ ...d, hasSpoiler: e.target.checked }))}
          />
          Contains spoilers
        </label>
        <Button type="submit" disabled={create.isPending}>
          Submit review
        </Button>
      </form>
    </section>
  );
}

export default function BookReviews(props: Props) {
  return (
    <Island>
      <ReviewsInner {...props} />
    </Island>
  );
}
