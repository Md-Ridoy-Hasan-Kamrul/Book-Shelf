import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';

export async function getPublisherBySlug(slug: string) {
  const profile = await prisma.publisherProfile.findUnique({
    where: { slug },
    include: {
      user: { select: { id: true, name: true, displayName: true, bannedAt: true } },
      books: {
        select: { id: true, slug: true, title: true, titleBn: true, author: true },
        take: 24,
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!profile || profile.user.bannedAt) {
    throw new AppError('NOT_FOUND', 'Publisher not found', 404);
  }

  return {
    id: profile.id,
    userId: profile.userId,
    businessName: profile.businessName,
    slug: profile.slug,
    verified: profile.verified,
    founding: profile.founding,
    displayName: profile.user.displayName ?? profile.user.name,
    books: profile.books,
  };
}
