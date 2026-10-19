import { useEffect, useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { Button } from '../ui/Button';

type Props = {
  bookId: string;
  releaseAt: string;
  serverNow: string;
  msUntilRelease: number;
  preorderEnabled: boolean;
};

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

export default function ReleaseCountdown({
  bookId,
  releaseAt,
  serverNow,
  msUntilRelease,
  preorderEnabled,
}: Props) {
  const [remaining, setRemaining] = useState(msUntilRelease);
  const [notifyDone, setNotifyDone] = useState(false);

  useEffect(() => {
    const origin = Date.parse(serverNow);
    const target = Date.parse(releaseAt);
    const skew = Date.now() - origin;
    const tick = () => {
      const nowApprox = Date.now() - skew;
      setRemaining(Math.max(0, target - nowApprox));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [releaseAt, serverNow]);

  useEffect(() => {
    void apiFetch('/publisher/time', z.object({ serverNow: z.string() }))
      .then((t) => {
        const origin = Date.parse(t.serverNow);
        const target = Date.parse(releaseAt);
        const skew = Date.now() - origin;
        setRemaining(Math.max(0, target - (Date.now() - skew)));
      })
      .catch(() => undefined);
  }, [releaseAt]);

  return (
    <div className="mt-4 rounded-[var(--radius-card)] border border-sun-200 bg-sun-100 p-4">
      <p className="m-0 text-sm font-semibold text-sun-800">
        {preorderEnabled ? 'Pre-order · ' : ''}Release countdown
      </p>
      <p className="mt-1 font-mono text-lg font-bold text-ink-900" aria-live="polite">
        {remaining > 0 ? formatMs(remaining) : 'Released'}
      </p>
      <p className="mt-1 text-xs text-ink-500">Uses server time (not your device clock).</p>
      {remaining > 0 && (
        <Button
          type="button"
          variant="ghost"
          className="mt-3"
          disabled={notifyDone}
          onClick={async () => {
            try {
              await apiFetch(
                `/publisher/releases/${bookId}/notify-me`,
                z.object({ id: z.string() }),
                { method: 'POST' },
              );
              setNotifyDone(true);
            } catch {
              /* login required */
            }
          }}
        >
          {notifyDone ? 'Notify saved' : 'Notify me'}
        </Button>
      )}
    </div>
  );
}
