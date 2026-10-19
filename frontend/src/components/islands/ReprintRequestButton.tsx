import { useState } from 'react';
import { z } from 'zod';
import { apiFetch, ApiError } from '../../lib/apiClient';
import { Button } from '../ui/Button';

type Props = { bookId: string; outOfStock: boolean };

export default function ReprintRequestButton({ bookId, outOfStock }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  if (!outOfStock) return null;

  return (
    <div className="mt-3">
      <Button
        type="button"
        variant="ghost"
        disabled={status === 'loading' || status === 'done'}
        onClick={async () => {
          setStatus('loading');
          setMessage(null);
          try {
            await apiFetch(`/publisher/books/${bookId}/reprint`, z.object({ id: z.string() }), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            });
            setStatus('done');
          } catch (err) {
            setStatus('error');
            setMessage(err instanceof ApiError ? err.message : 'Request failed');
          }
        }}
      >
        {status === 'done' ? 'Reprint requested' : 'Request reprint'}
      </Button>
      {message && <p className="mt-1 text-sm text-urgent-600">{message}</p>}
    </div>
  );
}
