import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { Button } from '../ui/Button';
import Island from './Island';

const statuses = ['WANT_TO_READ', 'CURRENTLY_READING', 'READ', 'PAUSED'] as const;

const itemSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  status: z.enum(statuses),
  pageProgress: z.number(),
  pageCount: z.number().nullable(),
  book: z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    author: z.string(),
    coverKey: z.string().nullable(),
  }),
});

const shelfSchema = z.object({
  columns: z.record(z.string(), z.array(itemSchema)),
});

const goalSchema = z.object({
  year: z.number(),
  targetBooks: z.number(),
  completedBooks: z.number(),
});

const labels: Record<(typeof statuses)[number], string> = {
  WANT_TO_READ: 'Want to read',
  CURRENTLY_READING: 'Reading',
  READ: 'Read',
  PAUSED: 'Paused',
};

function ProgressRing({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-brand-100"
      style={{
        background: `conic-gradient(var(--color-brand-600) ${pct}%, var(--color-sand) 0)`,
      }}
      role="img"
      aria-label={`${pct}% of reading goal`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-paper text-sm font-bold text-ink-900">
        {pct}%
      </div>
    </div>
  );
}

function BoardInner() {
  const qc = useQueryClient();
  const shelf = useQuery({
    queryKey: ['bookshelf'],
    queryFn: () => apiFetch('/bookshelf', shelfSchema),
  });
  const goal = useQuery({
    queryKey: ['bookshelf', 'goal'],
    queryFn: () => apiFetch('/bookshelf/goal', goalSchema),
  });

  const move = useMutation({
    mutationFn: (body: {
      bookId: string;
      status: (typeof statuses)[number];
      pageProgress?: number;
    }) =>
      apiFetch('/bookshelf/items', itemSchema, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bookshelf'] });
    },
  });

  if (shelf.isLoading || goal.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-(--radius-card) bg-sand" />
        ))}
      </div>
    );
  }

  if (shelf.isError) {
    return (
      <p className="text-urgent-600">
        Could not load shelf.{' '}
        <button type="button" className="underline" onClick={() => shelf.refetch()}>
          Retry
        </button>
      </p>
    );
  }

  const g = goal.data;

  return (
    <div className="space-y-8">
      {g ? (
        <section className="flex items-center gap-4 rounded-(--radius-card) border border-line bg-paper p-4 shadow-sm">
          <ProgressRing value={g.completedBooks} max={g.targetBooks} />
          <div>
            <h2 className="font-semibold text-ink-900">{g.year} reading goal</h2>
            <p className="text-sm text-ink-500">
              {g.completedBooks} / {g.targetBooks} books finished
            </p>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statuses.map((status) => {
          const col = shelf.data?.columns[status] ?? [];
          return (
            <section
              key={status}
              className="rounded-(--radius-card) border border-line bg-cream p-3"
            >
              <h3 className="mb-3 text-sm font-bold text-ink-900">{labels[status]}</h3>
              {col.length === 0 ? (
                <p className="text-xs text-ink-500">Empty</p>
              ) : (
                <ul className="list-none space-y-2 p-0">
                  {col.map((item) => (
                    <li
                      key={item.id}
                      className="rounded border border-line bg-paper p-2 text-sm shadow-sm"
                    >
                      <a
                        href={`/books/${item.book.slug}`}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        {item.book.title}
                      </a>
                      <p className="m-0 text-xs text-ink-500">{item.book.author}</p>
                      {item.pageCount ? (
                        <p className="m-0 text-xs text-ink-500">
                          p. {item.pageProgress}/{item.pageCount}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {statuses
                          .filter((s) => s !== status)
                          .map((s) => (
                            <Button
                              key={s}
                              type="button"
                              className="!px-2 !py-1 text-xs"
                              disabled={move.isPending}
                              onClick={() =>
                                move.mutate({
                                  bookId: item.bookId,
                                  status: s,
                                  pageProgress:
                                    s === 'READ' && item.pageCount
                                      ? item.pageCount
                                      : item.pageProgress,
                                })
                              }
                            >
                              → {labels[s]}
                            </Button>
                          ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function BookshelfBoard() {
  return (
    <Island>
      <BoardInner />
    </Island>
  );
}
