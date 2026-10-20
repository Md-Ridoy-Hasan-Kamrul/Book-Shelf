import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetchPaged } from '../../lib/apiClient';
import Island from './Island';

const dataSchema = z.object({
  pointsBalance: z.number(),
  items: z.array(
    z.object({
      id: z.string(),
      delta: z.number(),
      kind: z.string(),
      reason: z.string(),
      note: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});

function PointsInner() {
  const q = useQuery({
    queryKey: ['bookshelf', 'points'],
    queryFn: async () => {
      const { data } = await apiFetchPaged('/bookshelf/points', dataSchema);
      return data;
    },
  });

  if (q.isLoading) {
    return <div className="h-40 animate-pulse rounded-(--radius-card) bg-sand" aria-busy="true" />;
  }
  if (q.isError) {
    return (
      <p className="text-urgent-600">
        Failed to load.{' '}
        <button type="button" className="underline" onClick={() => q.refetch()}>
          Retry
        </button>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-lg font-bold text-ink-900">Balance: {q.data?.pointsBalance ?? 0} pts</p>
      <p className="text-sm text-ink-500">100 points = 10 BDT (max 10% of an order)</p>
      {(q.data?.items.length ?? 0) === 0 ? (
        <p className="text-ink-500">No point history yet.</p>
      ) : (
        <ul className="list-none space-y-2 p-0">
          {q.data?.items.map((row) => (
            <li
              key={row.id}
              className="flex justify-between gap-2 rounded border border-line bg-paper px-3 py-2 text-sm"
            >
              <div>
                <strong className="text-ink-900">{row.reason}</strong>
                {row.note ? <p className="m-0 text-ink-500">{row.note}</p> : null}
                <p className="m-0 text-xs text-ink-500">
                  {new Date(row.createdAt).toLocaleString()}
                </p>
              </div>
              <span
                className={row.delta >= 0 ? 'font-bold text-leaf-700' : 'font-bold text-urgent-600'}
              >
                {row.delta >= 0 ? '+' : ''}
                {row.delta}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PointsHistory() {
  return (
    <Island>
      <PointsInner />
    </Island>
  );
}
