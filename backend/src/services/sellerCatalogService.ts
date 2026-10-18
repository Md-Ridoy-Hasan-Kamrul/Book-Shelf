import { randomUUID } from 'node:crypto';
import type { ApiEnv, MeUser } from '@bookverse/shared';
import type { z } from 'zod';
import type { createBookListingSchema } from '@bookverse/shared';
import { AppError } from '../lib/appError.js';
import { optimizePreviewImage } from '../lib/optimizePreviewImage.js';
import { prisma } from '../lib/prisma.js';
import type { StorageProvider } from '../providers/storage/types.js';

type CreateInput = z.infer<typeof createBookListingSchema>;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function assertSeller(user: MeUser) {
  if (!['PUBLISHER', 'VENDOR', 'WRITER', 'ADMIN'].includes(user.role)) {
    throw new AppError('FORBIDDEN', 'Seller role required', 403);
  }
}

export async function createBookWithListing(user: MeUser, input: CreateInput) {
  assertSeller(user);

  const genre = await prisma.genre.findUnique({ where: { slug: input.genreSlug } });
  if (!genre) {
    throw new AppError('VALIDATION_ERROR', 'Unknown genre', 400);
  }

  const slugBase = slugify(`${input.title}-${randomUUID().slice(0, 6)}`);
  const sellerType =
    user.role === 'PUBLISHER'
      ? 'PUBLISHER'
      : user.role === 'VENDOR'
        ? 'VENDOR'
        : user.role === 'WRITER'
          ? 'WRITER'
          : 'USER';

  const vendor =
    user.role === 'VENDOR'
      ? await prisma.vendorProfile.findUnique({ where: { userId: user.id } })
      : null;

  return prisma.$transaction(async (tx) => {
    const book = await tx.book.create({
      data: {
        slug: slugBase,
        title: input.title,
        titleBn: input.titleBn,
        author: input.author,
        authorBn: input.authorBn,
        description: input.description,
        descriptionBn: input.descriptionBn,
        language: input.language,
        isbn: input.isbn,
        pageCount: input.pageCount,
        publishedYear: input.publishedYear,
        moodTags: input.moodTags,
        genreId: genre.id,
        publisherId:
          user.role === 'PUBLISHER'
            ? (await tx.publisherProfile.findUnique({ where: { userId: user.id } }))?.id
            : undefined,
        writerId:
          user.role === 'WRITER'
            ? (await tx.writerProfile.findUnique({ where: { userId: user.id } }))?.id
            : undefined,
      },
    });

    const listing = await tx.listing.create({
      data: {
        bookId: book.id,
        sellerId: user.id,
        sellerType,
        vendorId: vendor?.id,
        price: input.price,
        stock: input.stock,
        condition: input.condition,
        status: 'ACTIVE',
      },
    });

    return { book, listing };
  });
}

export async function updateListingStock(user: MeUser, listingId: string, stock: number) {
  return updateListing(user, listingId, { stock });
}

export async function updateListing(
  user: MeUser,
  listingId: string,
  patch: { stock?: number; price?: string },
  env?: ApiEnv,
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { book: { select: { title: true } } },
  });
  if (!listing) {
    throw new AppError('NOT_FOUND', 'Listing not found', 404);
  }
  if (listing.sellerId !== user.id && user.role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Not your listing', 403);
  }

  const before = {
    price: listing.price.toString(),
    stock: listing.stock,
    bookId: listing.bookId,
    bookTitle: listing.book.title,
  };

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      ...(patch.stock !== undefined ? { stock: patch.stock } : {}),
      ...(patch.price !== undefined ? { price: patch.price } : {}),
    },
  });

  if (env) {
    const { enqueueWishlistAlertsForListingChange } =
      await import('./retention/wishlistAlertService.js');
    await enqueueWishlistAlertsForListingChange(env, listingId, before, {
      price: updated.price.toString(),
      stock: updated.stock,
      bookId: listing.bookId,
      bookTitle: listing.book.title,
    });
  }

  return updated;
}

export async function uploadBookCover(
  user: MeUser,
  bookId: string,
  storage: StorageProvider,
  buffer: Buffer,
  contentType: string,
) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { listings: { where: { sellerId: user.id } } },
  });
  if (!book) {
    throw new AppError('NOT_FOUND', 'Book not found', 404);
  }
  if (user.role !== 'ADMIN' && book.listings.length === 0) {
    throw new AppError('FORBIDDEN', 'Not your book', 403);
  }
  const key = `covers/${bookId}/${randomUUID()}.jpg`;
  await storage.put(key, buffer, contentType);
  await prisma.book.update({ where: { id: bookId }, data: { coverKey: key } });
  return { coverUrl: storage.resolvePublicUrl(key) };
}

export async function submitLookInside(
  user: MeUser,
  bookId: string,
  storage: StorageProvider,
  pageBuffers: Array<{ buffer: Buffer; contentType: string }>,
  copyrightConfirmed: boolean,
) {
  if (!copyrightConfirmed) {
    throw new AppError('VALIDATION_ERROR', 'Copyright permission required', 400);
  }
  if (pageBuffers.length < 5 || pageBuffers.length > 10) {
    throw new AppError('VALIDATION_ERROR', 'Upload 5–10 preview pages', 400);
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { listings: { where: { sellerId: user.id } } },
  });
  if (!book || (user.role !== 'ADMIN' && book.listings.length === 0)) {
    throw new AppError('FORBIDDEN', 'Not your book', 403);
  }

  const pageKeys: string[] = [];
  for (const [i, page] of pageBuffers.entries()) {
    const optimized = await optimizePreviewImage(page.buffer);
    const key = `look-inside/${bookId}/page-${i + 1}.webp`;
    await storage.put(key, optimized, 'image/webp');
    pageKeys.push(key);
  }

  return prisma.bookLookInside.upsert({
    where: { bookId },
    create: {
      bookId,
      pageKeys,
      copyrightConfirmed: true,
      status: 'PENDING',
      submittedById: user.id,
    },
    update: {
      pageKeys,
      copyrightConfirmed: true,
      status: 'PENDING',
      submittedById: user.id,
      approvedById: null,
    },
  });
}

export async function approveLookInside(adminId: string, bookId: string) {
  return prisma.bookLookInside.update({
    where: { bookId },
    data: { status: 'APPROVED', approvedById: adminId },
  });
}
