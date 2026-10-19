import type { MoodEnum } from '@bookverse/shared';
import booksJson from '../data/mock-books.json';

export type MockBook = {
  id: string;
  slug: string;
  title: string;
  titleBn: string;
  author: string;
  coverUrl: string | null;
  minPrice: string | null;
  hasStock: boolean;
  language: string;
  genreSlug: string;
  moodTags: string[];
  pageCount: number | null;
  description: string;
  descriptionBn: string | null;
  authorBn: string | null;
  isbn: string | null;
  publishedYear: number | null;
  genreName: string;
  genreNameBn: string;
  publisherSlug: string | null;
  publisherName: string | null;
  publisherUserId: string | null;
  writerPenName: string | null;
  writerSlug: string | null;
  writerUserId: string | null;
  listings: Array<{
    id: string;
    price: string;
    stock: number;
    condition: string;
    sellerType: string;
    sellerName: string;
  }>;
  lookInsidePages: string[];
  outOfStock: boolean;
};

const books = booksJson as MockBook[];

export function mockAllBooks(): MockBook[] {
  return books;
}

export function mockBookCards(limit = 24) {
  return books.slice(0, limit).map((b) => ({
    id: b.id,
    slug: b.slug,
    title: b.title,
    titleBn: b.titleBn,
    author: b.author,
    coverUrl: b.coverUrl,
    minPrice: b.minPrice,
    hasStock: b.hasStock,
    language: b.language,
    genreSlug: b.genreSlug,
  }));
}

export function mockBookBySlug(slug: string): MockBook | null {
  return books.find((b) => b.slug === slug) ?? null;
}

export function mockSearch(q: string, limit = 24) {
  const needle = q.trim().toLowerCase();
  const items = books
    .filter(
      (b) =>
        !needle ||
        b.title.toLowerCase().includes(needle) ||
        b.titleBn.includes(q.trim()) ||
        b.author.toLowerCase().includes(needle),
    )
    .slice(0, limit)
    .map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      titleBn: b.titleBn,
      author: b.author,
      coverUrl: b.coverUrl,
      minPrice: b.minPrice,
      hasStock: b.hasStock,
      language: b.language,
      genreSlug: b.genreSlug,
    }));
  return { items, nextCursor: null as string | null };
}

export function mockSuggest(q: string) {
  const { items } = mockSearch(q, 6);
  return {
    books: items.map((b) => ({ slug: b.slug, title: b.titleBn || b.title, author: b.author })),
    authors: [...new Set(items.map((b) => b.author))].slice(0, 5).map((name) => ({
      name,
      count: books.filter((b) => b.author === name).length,
    })),
    publishers: [...new Set(books.map((b) => b.publisherSlug).filter(Boolean) as string[])]
      .slice(0, 5)
      .map((slug) => {
        const b = books.find((x) => x.publisherSlug === slug)!;
        return { slug, name: b.publisherName ?? slug };
      }),
  };
}

export function mockDiscoverConfig() {
  const moods: Array<{ id: MoodEnum; label: string; labelBn: string }> = [
    { id: 'happy', label: 'Happy', labelBn: 'খুশি' },
    { id: 'calm', label: 'Calm', labelBn: 'শান্ত' },
    { id: 'sad', label: 'Sad', labelBn: 'দুঃখিত' },
    { id: 'motivated', label: 'Motivated', labelBn: 'উদ্দীপ্ত' },
    { id: 'curious', label: 'Curious', labelBn: 'কৌতূহলী' },
    { id: 'romantic', label: 'Romantic', labelBn: 'রোমান্টিক' },
    { id: 'lonely', label: 'Lonely', labelBn: 'একাকী' },
    { id: 'stressed', label: 'Stressed', labelBn: 'স্ট্রেসড' },
    { id: 'adventurous', label: 'Adventurous', labelBn: 'অ্যাডভেঞ্চার' },
    { id: 'focused', label: 'Focused', labelBn: 'ফোকাসড' },
  ];
  return {
    moods,
    featureMoodLlm: false,
    disclaimer: 'these books may match your mood' as const,
  };
}

function toDiscoverCard(b: MockBook, why?: string) {
  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    titleBn: b.titleBn,
    author: b.author,
    coverUrl: b.coverUrl,
    minPrice: b.minPrice,
    hasStock: true as const,
    language: b.language,
    genreSlug: b.genreSlug,
    moodTags: b.moodTags,
    pageCount: b.pageCount,
    why,
  };
}

export function mockMoodBooks(mood: MoodEnum) {
  const items = books
    .filter((b) => b.moodTags.includes(mood))
    .map((b) => toDiscoverCard(b, `Matches mood “${mood}” (mock)`));
  return {
    disclaimer: 'these books may match your mood' as const,
    mood,
    items: items.length
      ? items
      : books.slice(0, 4).map((b) => toDiscoverCard(b, 'Fallback mock picks')),
    nextCursor: null as string | null,
  };
}

export function mockRecommendations() {
  const pick = (slice: MockBook[], why: string) => slice.map((b) => toDiscoverCard(b, why));
  return {
    cached: true,
    sections: [
      {
        key: 'forYou' as const,
        title: 'Recommended for you',
        items: pick(books.slice(0, 4), 'Popular in mock catalog'),
      },
      {
        key: 'becauseYouRead' as const,
        title: 'Because you browse fiction',
        items: pick(books.filter((b) => b.genreSlug === 'fiction').slice(0, 3), 'Same genre'),
      },
      {
        key: 'trendingGenres' as const,
        title: 'Trending in your genres',
        items: pick(books.slice(2, 6), 'Trending (mock)'),
      },
      {
        key: 'alsoFollow' as const,
        title: 'Readers also follow',
        items: pick(books.slice(4, 8), 'Community pick'),
      },
    ],
  };
}

export function mockPublisher(slug: string) {
  const pubBooks = books.filter((b) => b.publisherSlug === slug);
  const first = pubBooks[0] ?? books.find((b) => b.publisherSlug);
  if (!first?.publisherSlug) return null;
  return {
    userId: first.publisherUserId ?? 'mock-pub-user',
    businessName: first.publisherName ?? slug,
    slug: first.publisherSlug,
    verified: true,
    founding: slug === 'pathak-samabesh',
    displayName: first.publisherName ?? slug,
    books: pubBooks.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      titleBn: b.titleBn,
      author: b.author,
    })),
  };
}

export function mockWriter(slug: string) {
  const writerBooks = books.filter((b) => b.writerSlug === slug);
  const first = writerBooks[0];
  if (!first?.writerSlug || !first.writerUserId) return null;
  return {
    userId: first.writerUserId,
    penName: first.writerPenName ?? first.author,
    slug: first.writerSlug,
    bio: `Mock bio for ${first.writerPenName ?? first.author}.`,
    verified: true,
    displayName: first.writerPenName ?? first.author,
    books: writerBooks.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      titleBn: b.titleBn,
    })),
    posts: [
      {
        id: 'mock-post-1',
        type: 'STATUS',
        body: 'নতুন বই পড়ার মুডে আছেন? BookVerse mock feed।',
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function mockSellerListings() {
  return {
    items: books.slice(0, 5).map((b) => ({
      id: b.listings[0]?.id ?? b.id,
      bookTitle: b.titleBn,
      price: b.minPrice ?? '0.00',
      stock: b.listings[0]?.stock ?? 0,
      reservedQty: 0,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    })),
    nextCursor: null as string | null,
  };
}

export function mockAdminKpis() {
  return {
    gmvBdt: '125000.00',
    orderCount: 42,
    aovBdt: '2976.19',
    takeRatePct: '8.5',
    rtoRatePct: '2.1',
    claimRatePct: '0.8',
  };
}

export function mockAdminReconcile() {
  return {
    ok: true,
    issues: [] as Array<{
      orderId: string;
      expectedPaisa: string;
      ledgerPaisa: string;
      message: string;
    }>,
  };
}
