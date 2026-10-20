import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { apiFetch, apiFetchPaged } from '../../lib/apiClient';
import { useMockData } from '../../lib/mockMode';
import Island from './Island';

const postCardSchema = z.object({
  id: z.string(),
  type: z.string(),
  body: z.string(),
  hasSpoiler: z.boolean(),
  isSponsored: z.boolean(),
  likeCount: z.number(),
  dislikeCount: z.number(),
  commentCount: z.number(),
  authorName: z.string(),
  bookId: z.string().nullable(),
  viewerReaction: z.enum(['LIKE', 'DISLIKE']).nullable(),
});

const feedDataSchema = z.object({
  items: z.array(postCardSchema),
});

function FeedInner() {
  const qc = useQueryClient();
  const sentinel = useRef<HTMLDivElement | null>(null);
  const [spoilerOpen, setSpoilerOpen] = useState<Record<string, boolean>>({});

  const feed = useInfiniteQuery({
    queryKey: ['feed', 'mixed', useMockData() ? 'mock' : 'live'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      if (useMockData()) {
        if (pageParam) return { items: [] as z.infer<typeof postCardSchema>[], nextCursor: null };
        return {
          items: [
            {
              id: 'mock-post-feed-1',
              type: 'STATUS',
              body: 'আজকের মুড: কৌতূহলী: BookVerse mock feed থেকে।',
              hasSpoiler: false,
              isSponsored: false,
              likeCount: 12,
              dislikeCount: 0,
              commentCount: 2,
              authorName: 'Mock Reader',
              bookId: 'mock-book-2',
              viewerReaction: null,
            },
            {
              id: 'mock-post-feed-2',
              type: 'QUOTE',
              body: '“বই পড়া মানে অন্য জীবনে হাঁটা।”',
              hasSpoiler: false,
              isSponsored: false,
              likeCount: 34,
              dislikeCount: 1,
              commentCount: 5,
              authorName: 'Night Writer',
              bookId: 'mock-book-8',
              viewerReaction: null,
            },
          ],
          nextCursor: null as string | null,
        };
      }
      const q = pageParam ? `?mode=mixed&cursor=${encodeURIComponent(pageParam)}` : '?mode=mixed';
      const { data, meta } = await apiFetchPaged(`/posts/feed${q}`, feedDataSchema);
      const nextCursor = typeof meta.nextCursor === 'string' ? meta.nextCursor : null;
      return { items: data.items, nextCursor };
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && feed.hasNextPage && !feed.isFetchingNextPage) {
        void feed.fetchNextPage();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [feed]);

  const react = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: 'LIKE' | 'DISLIKE' }) => {
      if (useMockData()) return Promise.resolve({ ok: true });
      return apiFetch(`/posts/${id}/react`, z.object({ ok: z.boolean() }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
    },
    onMutate: async ({ id, kind }) => {
      await qc.cancelQueries({ queryKey: ['feed', 'mixed'] });
      qc.setQueryData(
        ['feed', 'mixed'],
        (
          old:
            | { pages: { items: z.infer<typeof postCardSchema>[]; nextCursor: string | null }[] }
            | undefined,
        ) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((post) => {
                if (post.id !== id) return post;
                const was = post.viewerReaction;
                let likeCount = post.likeCount;
                let dislikeCount = post.dislikeCount;
                let viewerReaction: 'LIKE' | 'DISLIKE' | null = kind;
                if (was === kind) {
                  viewerReaction = null;
                  if (kind === 'LIKE') likeCount -= 1;
                  else dislikeCount -= 1;
                } else {
                  if (was === 'LIKE') likeCount -= 1;
                  if (was === 'DISLIKE') dislikeCount -= 1;
                  if (kind === 'LIKE') likeCount += 1;
                  else dislikeCount += 1;
                }
                return { ...post, likeCount, dislikeCount, viewerReaction };
              }),
            })),
          };
        },
      );
    },
    onError: () => void qc.invalidateQueries({ queryKey: ['feed', 'mixed'] }),
  });

  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-4 pb-24">
      {feed.isLoading && (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-(--radius-card) bg-sand" />
          ))}
        </div>
      )}
      {feed.isError && (
        <p className="text-urgent-600">
          Feed failed.{' '}
          <button type="button" className="underline" onClick={() => feed.refetch()}>
            Retry
          </button>
        </p>
      )}
      {items.length === 0 && !feed.isLoading && (
        <p className="text-ink-500">No posts yet: be the first to share.</p>
      )}
      <ul className="list-none space-y-3 p-0">
        {items.map((post) => (
          <li
            key={post.id}
            className="rounded-(--radius-card) border border-line bg-paper p-4 text-sm shadow-sm"
          >
            <div className="flex justify-between gap-2">
              <strong className="text-ink-900">{post.authorName}</strong>
              {post.isSponsored ? (
                <span className="rounded-full bg-sun-100 px-2 py-0.5 text-xs font-semibold text-sun-800">
                  Sponsored
                </span>
              ) : null}
            </div>
            {post.hasSpoiler && !spoilerOpen[post.id] ? (
              <button
                type="button"
                className="mt-2 rounded bg-sand px-2 py-1 text-xs font-semibold text-ink-700"
                onClick={() => setSpoilerOpen((s) => ({ ...s, [post.id]: true }))}
              >
                Spoiler: tap to reveal
              </button>
            ) : (
              <p className="mt-2 text-ink-700">{post.body}</p>
            )}
            {post.bookId ? (
              <a href={`/books/${post.bookId}`} className="text-xs font-semibold text-brand-700">
                View book
              </a>
            ) : null}
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                className={`font-semibold ${post.viewerReaction === 'LIKE' ? 'text-brand-700' : 'text-ink-500'}`}
                onClick={() => react.mutate({ id: post.id, kind: 'LIKE' })}
              >
                Like {post.likeCount}
              </button>
              <button
                type="button"
                className={`font-semibold ${post.viewerReaction === 'DISLIKE' ? 'text-ink-900' : 'text-ink-500'}`}
                onClick={() => react.mutate({ id: post.id, kind: 'DISLIKE' })}
              >
                Dislike {post.dislikeCount}
              </button>
              <span className="text-ink-500">{post.commentCount} comments</span>
            </div>
          </li>
        ))}
      </ul>
      <div ref={sentinel} className="h-4" aria-hidden="true" />
      {feed.isFetchingNextPage && <p className="text-center text-sm text-ink-500">Loading more…</p>}
    </div>
  );
}

export default function SocialFeed() {
  return (
    <Island>
      <FeedInner />
    </Island>
  );
}
