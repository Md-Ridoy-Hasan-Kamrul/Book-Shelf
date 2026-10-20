import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { roleApplicationTypeSchema } from '@bookverse/shared';
import { apiFetch } from '../../lib/apiClient';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

type Props = {
  name: string;
  email: string;
  role: string;
  usedBooks: boolean;
  sponsored: boolean;
  liveEvents: boolean;
};

export default function AccountPanel({
  name,
  email,
  role,
  usedBooks,
  sponsored,
  liveEvents,
}: Props) {
  const [type, setType] = useState<'WRITER' | 'PUBLISHER' | 'VENDOR'>('WRITER');
  const [note, setNote] = useState('');
  const [docUrl, setDocUrl] = useState('local:id-document');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const canApply = role === 'USER';

  async function submitApplication(e: FormEvent) {
    e.preventDefault();
    if (!canApply) return;
    setStatus('loading');
    setError(null);
    try {
      const parsedType = roleApplicationTypeSchema.parse(type);
      await apiFetch(
        '/role-applications',
        z.object({
          id: z.string(),
          type: z.string(),
          status: z.string(),
        }),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: parsedType,
            note: note.trim() || undefined,
            documents: [docUrl.trim() || 'local:id-document'],
          }),
        },
      );
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Application failed');
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-(--radius-card) border border-line bg-paper p-4">
        <h2 className="m-0 font-display text-lg font-bold text-ink-900">Account</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <div>
            <dt className="text-ink-500">Name</dt>
            <dd className="m-0 font-semibold text-ink-900">{name}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Email</dt>
            <dd className="m-0 font-semibold text-ink-900">{email}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Role</dt>
            <dd className="m-0 font-semibold text-ink-900">{role}</dd>
          </div>
        </dl>
        <ul className="mt-4 flex list-none flex-wrap gap-3 p-0 text-sm font-semibold">
          <li>
            <a href="/bookshelf" className="text-brand-700 no-underline hover:underline">
              Bookshelf
            </a>
          </li>
          <li>
            <a href="/orders" className="text-brand-700 no-underline hover:underline">
              Orders
            </a>
          </li>
          <li>
            <a href="/points" className="text-brand-700 no-underline hover:underline">
              Points
            </a>
          </li>
          {usedBooks ? (
            <li>
              <a href="/sell/used" className="text-brand-700 no-underline hover:underline">
                Sell used
              </a>
            </li>
          ) : null}
          {sponsored ? (
            <li>
              <a href="/publisher/growth" className="text-brand-700 no-underline hover:underline">
                Publisher growth
              </a>
            </li>
          ) : null}
          {liveEvents && (role === 'WRITER' || role === 'ADMIN') ? (
            <li>
              <a href="/seller/dashboard" className="text-brand-700 no-underline hover:underline">
                Seller dashboard
              </a>
            </li>
          ) : null}
          {role === 'ADMIN' || role === 'MODERATOR' ? (
            <li>
              <a href="/admin/dashboard" className="text-brand-700 no-underline hover:underline">
                Admin
              </a>
            </li>
          ) : null}
          {role === 'PUBLISHER' || role === 'VENDOR' || role === 'WRITER' ? (
            <li>
              <a href="/seller/dashboard" className="text-brand-700 no-underline hover:underline">
                Seller dashboard
              </a>
            </li>
          ) : null}
        </ul>
      </section>

      {canApply ? (
        <section className="rounded-(--radius-card) border border-line bg-paper p-4">
          <h2 className="m-0 font-display text-lg font-bold text-ink-900">
            Apply for a seller role
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            WRITER, PUBLISHER, or VENDOR: admin reviews documents. You cannot set your own role.
          </p>
          <form className="mt-4 space-y-3" onSubmit={(e) => void submitApplication(e)}>
            <Select
              label="Role"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              options={[
                { value: 'WRITER', label: 'Writer' },
                { value: 'PUBLISHER', label: 'Publisher' },
                { value: 'VENDOR', label: 'Vendor' },
              ]}
            />
            <Input
              label="Document URL or local ref"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              required
            />
            <Textarea
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <Button type="submit" disabled={status === 'loading' || status === 'done'}>
              {status === 'done'
                ? 'Submitted'
                : status === 'loading'
                  ? 'Sending…'
                  : 'Submit application'}
            </Button>
            {error ? <p className="m-0 text-sm text-urgent-600">{error}</p> : null}
            {status === 'done' ? (
              <p className="m-0 text-sm text-leaf-700">
                Application received: wait for admin review.
              </p>
            ) : null}
          </form>
        </section>
      ) : (
        <p className="text-sm text-ink-500">Role applications are for USER accounts only.</p>
      )}
    </div>
  );
}
