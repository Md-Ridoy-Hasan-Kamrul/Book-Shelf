import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { Button } from '../ui/Button';

type Props = { eventId: string; userId?: string; userName?: string };

type ChatMsg = { id: string; userId: string; userName: string; body: string; at: string };
type QItem = { id: string; body: string; userName: string; createdAt: string };

const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startsAt: z.string(),
  status: z.string(),
  externalLiveUrl: z.string().nullable(),
  serverNow: z.string(),
  msUntilStart: z.number(),
  pinnedBook: z
    .object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
      titleBn: z.string(),
      author: z.string(),
    })
    .nullable(),
  questionQueue: z.array(
    z.object({
      id: z.string(),
      body: z.string(),
      userName: z.string(),
      createdAt: z.string(),
    }),
  ),
});

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

export default function LiveEventRoom({ eventId, userId, userName }: Props) {
  const [event, setEvent] = useState<z.infer<typeof eventSchema> | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [questions, setQuestions] = useState<QItem[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [qInput, setQInput] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const [banner, setBanner] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    void apiFetch(`/writer/events/${eventId}`, eventSchema)
      .then((data) => {
        setEvent(data);
        setQuestions(data.questionQueue);
        setRemaining(data.msUntilStart);
      })
      .catch(() => setStatus('error'));
  }, [eventId]);

  useEffect(() => {
    if (!event) return;
    const origin = Date.parse(event.serverNow);
    const start = Date.parse(event.startsAt);
    const skew = Date.now() - origin;
    const id = window.setInterval(() => {
      setRemaining(Math.max(0, start - (Date.now() - skew)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [event]);

  useEffect(() => {
    const socket = io({
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 800,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('live');
      setBanner(null);
      socket.emit('join', { eventId, userId, userName });
    });
    socket.on('disconnect', () => {
      setBanner('Reconnecting…');
    });
    socket.on('reconnect', () => {
      setBanner(null);
      socket.emit('join', { eventId, userId, userName });
    });
    socket.on('history', (msgs: ChatMsg[]) => setMessages(msgs));
    socket.on('chat', (msg: ChatMsg) => setMessages((prev) => [...prev.slice(-100), msg]));
    socket.on('question', (q: QItem) => setQuestions((prev) => [...prev, q]));
    socket.on('error_msg', (err: { code: string; message: string }) => {
      setBanner(err.message);
      if (err.code === 'BANNED') setStatus('error');
    });

    return () => {
      socket.disconnect();
    };
  }, [eventId, userId, userName]);

  if (status === 'error' && !event) {
    return <p className="text-urgent-600">Could not load event (is FEATURE_LIVE_EVENTS on?)</p>;
  }

  return (
    <div className="grid gap-6 min-[900px]:grid-cols-[1.2fr_0.8fr]">
      <div>
        <h1 className="m-0 font-display text-2xl font-bold text-ink-900">{event?.title ?? '…'}</h1>
        <p className="mt-1 text-sm text-ink-500">
          Countdown (server time): {remaining > 0 ? formatMs(remaining) : 'Started'} ·{' '}
          {event?.status}
        </p>
        {banner && <p className="mt-2 text-sm text-sun-800">{banner}</p>}

        {event?.externalLiveUrl && (
          <p className="mt-3 text-sm">
            Live stream (external):{' '}
            <a
              href={event.externalLiveUrl}
              className="font-semibold text-brand-700"
              target="_blank"
              rel="noreferrer"
            >
              Open link
            </a>
            <span className="text-ink-500">: we do not host video</span>
          </p>
        )}

        {event?.pinnedBook && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-4">
            <div>
              <p className="m-0 text-xs font-bold text-brand-600 uppercase">Pinned book</p>
              <p className="m-0 font-display font-bold text-ink-900">{event.pinnedBook.titleBn}</p>
              <p className="m-0 text-sm text-ink-500">{event.pinnedBook.author}</p>
            </div>
            <a
              href={`/books/${event.pinnedBook.slug}`}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-card)] bg-cta-500 px-4 text-sm font-semibold text-ink-900 no-underline"
            >
              Buy
            </a>
          </div>
        )}

        <div className="mt-4 rounded-[var(--radius-card)] border border-line bg-paper p-3">
          <p className="m-0 text-xs font-bold text-ink-500 uppercase">Moderated chat</p>
          <ul className="mt-2 max-h-64 list-none space-y-1 overflow-y-auto p-0 text-sm">
            {messages.map((m) => (
              <li key={m.id}>
                <span className="font-semibold text-ink-900">{m.userName}: </span>
                {m.body}
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatInput.trim()) return;
              socketRef.current?.emit('chat', { body: chatInput });
              setChatInput('');
            }}
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="min-h-11 flex-1 rounded-[var(--radius-card)] border border-line px-3 text-sm"
              placeholder={userId ? 'Say something…' : 'Login to chat'}
              disabled={!userId || status === 'error'}
              maxLength={400}
            />
            <Button type="submit" disabled={!userId}>
              Send
            </Button>
          </form>
        </div>
      </div>

      <aside className="rounded-[var(--radius-card)] border border-line bg-sand p-4">
        <h2 className="m-0 font-display text-lg font-bold text-ink-900">Question queue</h2>
        <ul className="mt-3 list-none space-y-2 p-0 text-sm">
          {questions.map((q) => (
            <li key={q.id} className="rounded-lg bg-paper p-2">
              <span className="font-semibold">{q.userName}</span>
              <p className="m-0 mt-1 text-ink-700">{q.body}</p>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!qInput.trim()) return;
            socketRef.current?.emit('question', { body: qInput });
            setQInput('');
          }}
        >
          <textarea
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            rows={2}
            maxLength={500}
            disabled={!userId}
            className="rounded-[var(--radius-card)] border border-line bg-paper px-3 py-2 text-sm"
            placeholder="Ask the writer…"
          />
          <Button type="submit" disabled={!userId}>
            Queue question
          </Button>
        </form>
      </aside>
    </div>
  );
}
