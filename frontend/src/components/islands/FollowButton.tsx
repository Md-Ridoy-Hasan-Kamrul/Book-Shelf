import { useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { Button } from '../ui/Button';

type Props = {
  userId: string;
  initialFollowing?: boolean;
};

const followSchema = z.object({ following: z.boolean() });

export default function FollowButton({ userId, initialFollowing = false }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function toggle() {
    setStatus('loading');
    setMessage(null);
    try {
      if (following) {
        await apiFetch(`/users/${userId}/follow`, followSchema, { method: 'DELETE' });
        setFollowing(false);
      } else {
        await apiFetch(`/users/${userId}/follow`, followSchema, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        setFollowing(true);
      }
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Could not update follow');
    }
  }

  async function block() {
    if (!window.confirm('Block this user? Follows both ways will be removed.')) return;
    setStatus('loading');
    try {
      await apiFetch(`/users/${userId}/block`, z.object({ blocked: z.boolean() }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      setFollowing(false);
      setMessage('Blocked');
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Could not block');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={following ? 'ghost' : 'brand'}
        disabled={status === 'loading'}
        onClick={() => void toggle()}
      >
        {following ? 'Following' : 'Follow'}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={status === 'loading'}
        onClick={() => void block()}
      >
        Block
      </Button>
      {message ? <p className="m-0 text-sm text-urgent-600">{message}</p> : null}
    </div>
  );
}
