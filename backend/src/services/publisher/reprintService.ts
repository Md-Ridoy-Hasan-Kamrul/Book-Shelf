import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';

export async function requestReprint(
  userId: string,
  bookId: string,
  input: { district?: string; note?: string },
) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      listings: { where: { status: 'ACTIVE' }, select: { stock: true } },
    },
  });
  if (!book) throw new AppError('NOT_FOUND', 'Book not found', 404);
  const inStock = book.listings.some((l) => l.stock > 0);
  if (inStock) {
    throw new AppError('VALIDATION_ERROR', 'Reprint requests are only for out-of-stock books', 400);
  }

  try {
    return await prisma.reprintRequest.create({
      data: {
        bookId,
        userId,
        district: input.district,
        note: input.note,
      },
      select: { id: true, bookId: true, district: true, createdAt: true },
    });
  } catch {
    throw new AppError('CONFLICT', 'You already requested a reprint for this book', 409);
  }
}

export async function getReprintDemand(
  publisherUserId: string,
  query: { bookId?: string; from?: string; to?: string },
) {
  const profile = await prisma.publisherProfile.findUnique({ where: { userId: publisherUserId } });
  if (!profile) throw new AppError('FORBIDDEN', 'Publisher profile required', 403);

  const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 86400_000);
  const to = query.to ? new Date(query.to) : new Date();

  const requests = await prisma.reprintRequest.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      book: {
        publisherId: profile.id,
        ...(query.bookId ? { id: query.bookId } : {}),
      },
    },
    select: {
      id: true,
      bookId: true,
      district: true,
      createdAt: true,
      book: { select: { title: true, slug: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const byDate = new Map<string, number>();
  const byDistrict = new Map<string, number>();
  for (const r of requests) {
    const day = r.createdAt.toISOString().slice(0, 10);
    byDate.set(day, (byDate.get(day) ?? 0) + 1);
    const d = r.district ?? 'Unknown';
    byDistrict.set(d, (byDistrict.get(d) ?? 0) + 1);
  }

  const trend = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    total: requests.length,
    byDistrict: [...byDistrict.entries()].map(([district, count]) => ({ district, count })),
    trend,
  };
}
