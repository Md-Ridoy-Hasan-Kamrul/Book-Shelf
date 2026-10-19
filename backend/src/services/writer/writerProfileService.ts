import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function getWriterBySlug(slug: string) {
  const profile = await prisma.writerProfile.findUnique({
    where: { slug },
    include: {
      user: { select: { id: true, name: true, displayName: true, bannedAt: true } },
      books: {
        select: { id: true, slug: true, title: true, titleBn: true, coverKey: true },
        take: 24,
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!profile || profile.user.bannedAt) {
    throw new AppError('NOT_FOUND', 'Writer not found', 404);
  }

  const posts = await prisma.post.findMany({
    where: {
      authorId: profile.userId,
      deletedAt: null,
      hiddenAt: null,
      followersOnly: false,
      type: { in: ['BLOG', 'ANNOUNCEMENT', 'QUOTE', 'STATUS'] },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 20,
    select: {
      id: true,
      type: true,
      body: true,
      bookId: true,
      createdAt: true,
      followersOnly: true,
    },
  });

  return {
    id: profile.id,
    userId: profile.userId,
    penName: profile.penName,
    slug: profile.slug,
    bio: profile.bio,
    verified: profile.verified,
    displayName: profile.user.displayName ?? profile.user.name,
    books: profile.books,
    posts: posts.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

export async function updateWriterProfile(
  userId: string,
  role: string,
  input: { penName?: string; bio?: string; slug?: string },
) {
  if (role !== 'WRITER' && role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Writer role required', 403);
  }
  const existing = await prisma.writerProfile.findUnique({ where: { userId } });
  if (!existing && role !== 'ADMIN') {
    throw new AppError('NOT_FOUND', 'Writer profile missing', 404);
  }

  const slug = input.slug ?? (input.penName ? slugify(input.penName) : undefined);
  if (slug) {
    const clash = await prisma.writerProfile.findFirst({
      where: { slug, NOT: { userId } },
    });
    if (clash) throw new AppError('CONFLICT', 'Slug already taken', 409);
  }

  return prisma.writerProfile.update({
    where: { userId },
    data: {
      ...(input.penName !== undefined ? { penName: input.penName } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(slug ? { slug } : {}),
    },
  });
}

export { slugify as slugifyWriterPenName };
