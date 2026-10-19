import { useEffect, useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';

const itemSchema = z.object({
  queue: z.string(),
  jobId: z.union([z.string(), z.number()]).nullable().optional(),
  name: z.string(),
  failedReason: z.string().nullable().optional(),
  attemptsMade: z.number(),
  timestamp: z.number(),
});

export default function AdminDeadLetterPanel() {
  const [items, setItems] = useState<z.infer<typeof itemSchema>[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  const load = () => {
    setStatus('loading');
    void apiFetch('/admin/dashboard/dead-letter-jobs', z.array(itemSchema))
      .then((data) => {
        setItems(data);
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(() => {
    load();
  }, []);

  if (status === 'loading') return <Skeleton className="h-24" />;
  if (status === 'error') {
    return (
      <ErrorState
        message="Could not load dead-letter jobs (admin + 2FA if enabled)"
        onRetry={load}
      />
    );
  }

  return (
    <section aria-labelledby="dlq-title" className="mt-8">
      <h2 id="dlq-title" className="m-0 font-display text-xl font-bold text-ink-900">
        BullMQ dead-letter (failed jobs)
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-500">
          No failed jobs in checkout/money/courier/notifications.
        </p>
      ) : (
        <ul className="mt-3 list-none space-y-2 p-0 text-sm">
          {items.map((j) => (
            <li
              key={`${j.queue}-${j.jobId}-${j.timestamp}`}
              className="rounded-[var(--radius-card)] border border-line bg-paper p-3"
            >
              <span className="font-semibold">{j.queue}</span> · {j.name} · attempts{' '}
              {j.attemptsMade}
              <p className="m-0 mt-1 text-urgent-600">{j.failedReason ?? 'failed'}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
