import {
  mockAllBooks,
  mockBookBySlug,
  mockDiscoverConfig,
  mockMoodBooks,
  mockRecommendations,
  mockSearch,
  mockSuggest,
} from './mockCatalog';
import type { MoodEnum } from '@bookverse/shared';

const mockUser = {
  id: 'mock-user-1',
  name: 'Mock Reader',
  email: 'reader@bookverse.local',
  role: 'USER' as const,
  phone: null as string | null,
  phoneVerified: false,
  emailVerified: true,
  image: null as string | null,
  displayName: 'Mock Reader',
};

/** Path without origin, may include query string. */
export function resolveMockApi(pathWithQuery: string, method = 'GET', body?: unknown): unknown {
  const url = new URL(pathWithQuery, 'http://mock.local');
  const path = url.pathname.replace(/\/$/, '') || '/';
  const q = url.searchParams;
  const m = method.toUpperCase();

  if (path === '/me' || path === '/api/auth/get-session') {
    // Role comes from cookie on SSR via fetchMe; client /me uses default USER
    return { user: mockUser, session: { id: 'mock-session', userId: mockUser.id } };
  }

  if (path === '/discover/config') return mockDiscoverConfig();
  if (path === '/discover/recommend') return mockRecommendations();
  if (path === '/discover/mood') {
    const mood = (q.get('mood') ?? 'curious') as MoodEnum;
    return mockMoodBooks(mood);
  }
  if (path === '/discover/mood/log' && m === 'POST') {
    return { id: 'mock-mood-log', mood: (body as { mood?: string })?.mood ?? 'curious' };
  }
  if (path === '/discover/mood/classify' && m === 'POST') {
    return { mood: 'curious', source: 'fallback', model: 'mock-local' };
  }

  if (path === '/books') {
    const limit = Number(q.get('limit') ?? 24) || 24;
    return {
      items: mockAllBooks()
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
        })),
      nextCursor: null,
    };
  }

  const bookMatch = path.match(/^\/books\/([^/]+)$/);
  if (bookMatch && m === 'GET') {
    const b = mockBookBySlug(decodeURIComponent(bookMatch[1]!));
    if (!b) return null;
    return b;
  }

  if (path === '/search') return mockSearch(q.get('q') ?? '');
  if (path === '/search/suggest') return mockSuggest(q.get('q') ?? '');

  if (path === '/notifications/unread-count') return { count: 2 };
  if (path === '/notifications') {
    return {
      items: [
        {
          id: 'n1',
          title: 'Welcome to BookVerse',
          body: 'Mock notification: backend on hold.',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'n2',
          title: 'New in Fiction',
          body: 'পদ্মা নদীর মাঝি is trending.',
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  if (path === '/bookshelf') {
    const cols = {
      WANT_TO_READ: [] as unknown[],
      CURRENTLY_READING: [] as unknown[],
      READ: [] as unknown[],
      PAUSED: [] as unknown[],
    };
    mockAllBooks()
      .slice(0, 3)
      .forEach((b, i) => {
        const status = i === 0 ? 'CURRENTLY_READING' : 'WANT_TO_READ';
        const item = {
          id: `shelf-${i}`,
          bookId: b.id,
          status,
          pageProgress: i === 0 ? 40 : 0,
          pageCount: b.pageCount,
          book: {
            id: b.id,
            slug: b.slug,
            title: b.titleBn,
            author: b.author,
            coverKey: null,
          },
        };
        cols[status].push(item);
      });
    return { columns: cols };
  }
  if (path === '/bookshelf/goal') {
    return { year: new Date().getFullYear(), targetBooks: 24, completedBooks: 3 };
  }
  if (path.startsWith('/bookshelf') && m === 'POST') {
    return {
      id: 'mock-shelf-item',
      bookId: 'mock-book-1',
      status: 'WANT_TO_READ',
      pageProgress: 0,
      pageCount: 200,
      book: {
        id: 'mock-book-1',
        slug: 'padma-nodir-majhi',
        title: 'পদ্মা নদীর মাঝি',
        author: 'Manik Bandopadhyay',
        coverKey: null,
      },
    };
  }

  if (path === '/wishlist' || path.startsWith('/wishlist/')) {
    if (m === 'POST' || m === 'DELETE') return { ok: true, wishlisted: m === 'POST' };
    return { items: [], nextCursor: null };
  }

  if (path.includes('/react') && m === 'POST') return { ok: true };
  if (path.startsWith('/posts')) {
    if (m === 'POST') return { id: 'mock-post-new', ok: true };
    return {
      items: [
        {
          id: 'mock-post-feed-1',
          type: 'STATUS',
          body: 'Mock community post.',
          hasSpoiler: false,
          isSponsored: false,
          likeCount: 3,
          dislikeCount: 0,
          commentCount: 0,
          authorName: 'Mock Reader',
          bookId: null,
          viewerReaction: null,
        },
      ],
      nextCursor: null,
    };
  }

  if (path === '/addresses') {
    if (m === 'POST') {
      return {
        id: 'mock-addr-1',
        label: 'Home',
        phone: '01700000000',
        division: 'Dhaka',
        district: 'Dhaka',
        area: 'Dhanmondi',
        line1: 'Road 5',
        isDefault: true,
      };
    }
    return [
      {
        id: 'mock-addr-1',
        label: 'Home',
        phone: '01700000000',
        division: 'Dhaka',
        district: 'Dhaka',
        area: 'Dhanmondi',
        line1: 'Road 5',
        isDefault: true,
      },
    ];
  }

  if (path === '/checkout/quote' && m === 'POST') {
    return {
      sellerGroups: [
        {
          sellerId: 'mock-seller-1',
          sellerName: 'Pathak Samabesh',
          items: [
            {
              listingId: 'mock-listing-1',
              bookId: 'mock-book-1',
              title: 'পদ্মা নদীর মাঝি',
              unitPrice: '350.00',
              qty: 1,
              lineTotal: '350.00',
              availableQty: 12,
              inStock: true,
            },
          ],
          subtotal: '350.00',
          shippingFee: '60.00',
        },
      ],
      coupon: null,
      subtotal: '350.00',
      shippingTotal: '60.00',
      discountTotal: '0.00',
      total: '410.00',
      issues: [],
    };
  }

  if (path === '/checkout' && m === 'POST') {
    return {
      checkoutId: 'mock-checkout-1',
      orders: [
        {
          id: 'mock-order-1',
          sellerId: 'mock-seller-1',
          sellerName: 'Pathak Samabesh',
          status: 'PLACED',
          paymentMethod: 'COD',
          total: '410.00',
          createdAt: new Date().toISOString(),
        },
      ],
      total: '410.00',
      paymentMethod: 'COD',
    };
  }

  if (path === '/payments/initiate' && m === 'POST') {
    return { tranId: 'MOCK-TRAN-1', gatewayUrl: '/orders/mock-order-1' };
  }

  if (path.startsWith('/orders')) {
    if (path.match(/^\/orders\/[^/]+$/)) {
      return {
        id: 'mock-order-1',
        checkoutId: 'mock-checkout-1',
        status: 'PROCESSING',
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        subtotal: '350.00',
        shippingFee: '60.00',
        discount: '0.00',
        total: '410.00',
        sellerName: 'Pathak Samabesh',
        lineItems: [
          {
            title: 'পদ্মা নদীর মাঝি',
            unitPrice: '350.00',
            qty: 1,
            lineTotal: '350.00',
            commissionBps: 800,
            sellerAmount: '322.00',
          },
        ],
        statusHistory: [
          { status: 'PLACED', note: null, createdAt: new Date().toISOString() },
          { status: 'PROCESSING', note: 'Mock', createdAt: new Date().toISOString() },
        ],
        tracking: null,
        createdAt: new Date().toISOString(),
      };
    }
    return {
      items: [
        {
          id: 'mock-order-1',
          sellerId: 'mock-seller-1',
          sellerName: 'Pathak Samabesh',
          status: 'PROCESSING',
          paymentMethod: 'COD',
          total: '410.00',
          createdAt: new Date().toISOString(),
        },
      ],
      nextCursor: null,
    };
  }

  if (path === '/role-applications' && m === 'POST') {
    return { id: 'mock-role-app', status: 'PENDING' };
  }

  if (path.includes('/follow') || path.includes('/block')) {
    return { following: true, blocked: true };
  }

  if (path.startsWith('/reviews')) {
    if (m === 'POST') return { id: 'mock-review', ok: true };
    return {
      items: [
        {
          id: 'r1',
          rating: 5,
          body: 'দারুণ বই: mock review.',
          authorName: 'Mock Reader',
          createdAt: new Date().toISOString(),
          isVerifiedBuyer: true,
        },
      ],
      nextCursor: null,
    };
  }

  if (path.startsWith('/points') || path.includes('point')) {
    return {
      balance: 120,
      items: [
        {
          id: 'p1',
          delta: 10,
          reason: 'READ_LOG',
          createdAt: new Date().toISOString(),
        },
      ],
      nextCursor: null,
    };
  }

  if (path === '/publisher/track' && m === 'POST') {
    return { id: 'mock-track', kind: 'ADD_TO_CART', campaignId: 'mock-campaign' };
  }
  if (path.startsWith('/publisher') || path.startsWith('/writer')) {
    if (m === 'GET') return { items: [], serverNow: new Date().toISOString() };
    return { ok: true, id: 'mock-ok', kind: 'ADD_TO_CART', campaignId: 'mock-campaign' };
  }

  if (path.includes('dead-letter')) return [];

  // Mutations / unknown: soft success shapes common in FE
  if (m !== 'GET') {
    return { ok: true, success: true, id: `mock-${Date.now()}` };
  }

  return { items: [], nextCursor: null, ok: true };
}

export function getMockMeUser() {
  return mockUser;
}
