import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { Button } from '../ui/Button';
import Island from './Island';

function ComposerInner() {
  const [body, setBody] = useState('');
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [bookId, setBookId] = useState('');
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: () =>
      apiFetch('/posts', z.object({ id: z.string() }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TEXT',
          body,
          hasSpoiler,
          bookId: bookId.trim() || undefined,
          imageKeys: [],
        }),
      }),
    onSuccess: () => {
      setBody('');
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  return (
    <form
      className="rounded-[var(--radius-card)] border border-line bg-paper p-4"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <label className="sr-only" htmlFor="post-body">
        Post
      </label>
      <textarea
        id="post-body"
        className="min-h-24 w-full rounded border border-line p-2 text-sm"
        placeholder="What are you reading?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <input
        className="mt-2 w-full rounded border border-line px-2 py-1 text-sm"
        placeholder="Book ID (optional mention)"
        value={bookId}
        onChange={(e) => setBookId(e.target.value)}
      />
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={hasSpoiler}
          onChange={(e) => setHasSpoiler(e.target.checked)}
        />
        Spoiler
      </label>
      <Button type="submit" className="mt-3" disabled={create.isPending || body.length < 1}>
        Post
      </Button>
    </form>
  );
}

export default function PostComposer() {
  return (
    <Island>
      <ComposerInner />
    </Island>
  );
}
