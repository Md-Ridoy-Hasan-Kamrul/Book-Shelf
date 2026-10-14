import { useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { Button } from '../ui/Button';

type Props = { bookId: string };

export default function WishlistButton({ bookId }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={status === 'loading' || status === 'done'}
      onClick={async () => {
        setStatus('loading');
        try {
          await apiFetch(`/wishlist/${bookId}`, z.object({ id: z.string() }), { method: 'POST' });
          setStatus('done');
        } catch {
          setStatus('error');
        }
      }}
    >
      {status === 'done' ? 'Saved' : status === 'error' ? 'Login to save' : 'Wishlist'}
    </Button>
  );
}
