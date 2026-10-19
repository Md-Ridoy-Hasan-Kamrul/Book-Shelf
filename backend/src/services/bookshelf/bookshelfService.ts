import type { BookshelfStatus } from '@prisma/client';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { awardPoints } from '../points/awardPoints.js';
import { pointsForFinishBook, pointsForGoalComplete } from '../points/pointRules.js';
import { createPost } from '../social/postService.js';
import type { ApiEnv, MeUser } from '@bookverse/shared';

type ShelfRow = {
  id: string;
  bookId: string;
  status: BookshelfStatus;
  pageProgress: number;
  updatedAt: Date;
  book: {
    id: string;
    slug: string;
    title: string;
    titleBn: string;
    coverKey: string | null;
    pageCount: number | null;
    author: string;
  };
};

export async function listBookshelf(userId: string) {
  const items = await prisma.bookshelfItem.findMany({
    where: { userId },
    include: {
      book: {
        select: {
          id: true,
          slug: true,
          title: true,
          titleBn: true,
          coverKey: true,
          pageCount: true,
          author: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const mapped = items.map(mapItem);
  const columns: Record<BookshelfStatus, ReturnType<typeof mapItem>[]> = {
    WANT_TO_READ: [],
    CURRENTLY_READING: [],
    READ: [],
    PAUSED: [],
  };
  for (const item of mapped) {
    columns[item.status].push(item);
  }
  return { columns, items: mapped };
}

function mapItem(row: ShelfRow) {
  return {
    id: row.id,
    bookId: row.bookId,
    status: row.status,
    pageProgress: row.pageProgress,
    pageCount: row.book.pageCount,
    book: {
      id: row.book.id,
      slug: row.book.slug,
      title: row.book.title,
      titleBn: row.book.titleBn,
      coverKey: row.book.coverKey,
      author: row.book.author,
    },
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertBookshelfItem(
  user: MeUser,
  env: ApiEnv,
  input: {
    bookId: string;
    status: BookshelfStatus;
    pageProgress?: number;
    shareAsPost?: boolean;
  },
) {
  const book = await prisma.book.findUnique({ where: { id: input.bookId } });
  if (!book) throw new AppError('NOT_FOUND', 'Book not found', 404);

  const pageProgress = Math.max(0, input.pageProgress ?? 0);
  if (book.pageCount && pageProgress > book.pageCount) {
    throw new AppError('VALIDATION_ERROR', 'pageProgress exceeds pageCount', 400);
  }

  const year = new Date().getFullYear();
  let finishedNow = false;
  let goalJustCompleted = false;

  const item = await prisma.$transaction(async (tx) => {
    const prev = await tx.bookshelfItem.findUnique({
      where: { userId_bookId: { userId: user.id, bookId: input.bookId } },
    });

    const updated = await tx.bookshelfItem.upsert({
      where: { userId_bookId: { userId: user.id, bookId: input.bookId } },
      create: {
        userId: user.id,
        bookId: input.bookId,
        status: input.status,
        pageProgress,
      },
      update: {
        status: input.status,
        ...(input.pageProgress !== undefined ? { pageProgress } : {}),
      },
      include: {
        book: {
          select: {
            id: true,
            slug: true,
            title: true,
            titleBn: true,
            coverKey: true,
            pageCount: true,
            author: true,
          },
        },
      },
    });

    finishedNow = input.status === 'READ' && prev?.status !== 'READ';
    if (finishedNow) {
      const goal = await tx.readingGoal.upsert({
        where: { userId_year: { userId: user.id, year } },
        create: { userId: user.id, year, targetBooks: 12, completedBooks: 1 },
        update: { completedBooks: { increment: 1 } },
      });
      if (goal.completedBooks >= goal.targetBooks && goal.completedBooks - 1 < goal.targetBooks) {
        goalJustCompleted = true;
      }
    }

    return updated;
  });

  if (finishedNow) {
    await awardPoints(user.id, 'FINISH_BOOK', input.bookId, await pointsForFinishBook(), {
      note: `Finished ${book.title}`,
    });
  }
  if (goalJustCompleted) {
    await awardPoints(
      user.id,
      'GOAL_COMPLETE',
      `${user.id}:${year}`,
      await pointsForGoalComplete(),
      {
        note: `Reading goal ${year}`,
      },
    );
  }

  if (input.shareAsPost) {
    await createPost(user, env, {
      type: 'READING_UPDATE',
      body: `Shelf update: ${book.title} → ${input.status}${pageProgress ? ` (p.${pageProgress})` : ''}`,
      bookId: book.id,
      hasSpoiler: false,
      imageKeys: [],
      followersOnly: false,
    });
  }

  return mapItem(item);
}

export async function getOrCreateReadingGoal(userId: string, year = new Date().getFullYear()) {
  return prisma.readingGoal.upsert({
    where: { userId_year: { userId, year } },
    create: { userId, year, targetBooks: 12, completedBooks: 0 },
    update: {},
  });
}

export async function setReadingGoal(
  userId: string,
  targetBooks: number,
  year = new Date().getFullYear(),
) {
  if (!Number.isInteger(targetBooks) || targetBooks < 1 || targetBooks > 500) {
    throw new AppError('VALIDATION_ERROR', 'targetBooks must be 1–500', 400);
  }
  return prisma.readingGoal.upsert({
    where: { userId_year: { userId, year } },
    create: { userId, year, targetBooks, completedBooks: 0 },
    update: { targetBooks },
  });
}
