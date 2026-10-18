import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import Island from './Island';

function NotificationBellInner() {
  const [open, setOpen] = useState(false);
  const unread = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () =>
      apiFetch('/notifications/unread-count', z.object({ count: z.number() })).then((d) => d.count),
    refetchInterval: 60_000,
  });

  const list = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () =>
      apiFetch(
        '/notifications',
        z.object({
          items: z.array(
            z.object({
              id: z.string(),
              title: z.string(),
              body: z.string(),
              createdAt: z.string(),
            }),
          ),
        }),
      ),
    enabled: open,
  });

  return (
    <div className="relative">
      <button
        type="button"
        className="relative rounded-full border border-line bg-cream px-3 py-2 text-sm font-semibold"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        Bell
        {(unread.data ?? 0) > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-urgent-600 px-1 text-xs text-paper">
            {unread.data}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(90vw,20rem)] rounded-[var(--radius-card)] border border-line bg-paper p-3 shadow-lg">
          {list.isLoading && <p className="text-sm text-ink-500">Loading…</p>}
          {list.isError && (
            <p className="text-sm text-urgent-600">
              Could not load.{' '}
              <button type="button" className="underline" onClick={() => list.refetch()}>
                Retry
              </button>
            </p>
          )}
          {list.data?.items.length === 0 && (
            <p className="text-sm text-ink-500">No notifications yet.</p>
          )}
          <ul className="max-h-64 list-none space-y-2 overflow-y-auto p-0">
            {list.data?.items.map((n) => (
              <li key={n.id} className="border-b border-line pb-2 text-sm">
                <strong>{n.title}</strong>
                <p className="m-0 text-ink-700">{n.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function NotificationBell() {
  return (
    <Island>
      <NotificationBellInner />
    </Island>
  );
}
