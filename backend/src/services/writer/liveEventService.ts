import type { MeUser } from '@bookverse/shared';
import type { z } from 'zod';
import type { liveEventCreateSchema, liveEventUpdateSchema } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';

type CreateInput = z.infer<typeof liveEventCreateSchema>;
type UpdateInput = z.infer<typeof liveEventUpdateSchema>;

export async function createLiveEvent(host: MeUser, input: CreateInput) {
  if (host.role !== 'WRITER' && host.role !== 'PUBLISHER' && host.role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Writer/publisher required', 403);
  }
  // External live link only — never host video ourselves
  return prisma.liveEvent.create({
    data: {
      hostId: host.id,
      title: input.title,
      description: input.description,
      startsAt: new Date(input.startsAt),
      externalLiveUrl: input.externalLiveUrl,
      pinnedBookId: input.pinnedBookId,
    },
  });
}

export async function updateLiveEvent(host: MeUser, eventId: string, input: UpdateInput) {
  const event = await prisma.liveEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('NOT_FOUND', 'Event not found', 404);
  if (event.hostId !== host.id && host.role !== 'ADMIN' && host.role !== 'MODERATOR') {
    throw new AppError('FORBIDDEN', 'Not your event', 403);
  }
  return prisma.liveEvent.update({
    where: { id: eventId },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.externalLiveUrl !== undefined ? { externalLiveUrl: input.externalLiveUrl } : {}),
      ...(input.pinnedBookId !== undefined ? { pinnedBookId: input.pinnedBookId } : {}),
    },
  });
}

export async function getLiveEvent(eventId: string) {
  const event = await prisma.liveEvent.findUnique({
    where: { id: eventId },
    include: {
      host: { select: { id: true, name: true, displayName: true } },
      pinnedBook: {
        select: { id: true, slug: true, title: true, titleBn: true, author: true },
      },
      questions: {
        where: { status: 'QUEUED' },
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: { user: { select: { id: true, displayName: true, name: true } } },
      },
    },
  });
  if (!event) throw new AppError('NOT_FOUND', 'Event not found', 404);
  const serverNow = new Date();
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    status: event.status,
    externalLiveUrl: event.externalLiveUrl,
    pinnedBook: event.pinnedBook
      ? {
          id: event.pinnedBook.id,
          slug: event.pinnedBook.slug,
          title: event.pinnedBook.title,
          titleBn: event.pinnedBook.titleBn,
          author: event.pinnedBook.author,
        }
      : null,
    host: {
      id: event.host.id,
      name: event.host.displayName ?? event.host.name,
    },
    serverNow: serverNow.toISOString(),
    msUntilStart: Math.max(0, event.startsAt.getTime() - serverNow.getTime()),
    questionQueue: event.questions.map((q) => ({
      id: q.id,
      body: q.body,
      userName: q.user.displayName ?? q.user.name,
      createdAt: q.createdAt.toISOString(),
    })),
  };
}

export async function enqueueQuestion(userId: string, eventId: string, body: string) {
  const event = await prisma.liveEvent.findUnique({ where: { id: eventId } });
  if (!event || event.status === 'ENDED') {
    throw new AppError('NOT_FOUND', 'Event not available', 404);
  }
  const banned = await prisma.liveEventBan.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (banned) throw new AppError('FORBIDDEN', 'You are banned from this room', 403);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.bannedAt) throw new AppError('FORBIDDEN', 'Account banned', 403);

  return prisma.liveEventQuestion.create({
    data: { eventId, userId, body },
  });
}

export async function banFromEvent(
  moderator: MeUser,
  eventId: string,
  userId: string,
  reason?: string,
) {
  const event = await prisma.liveEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('NOT_FOUND', 'Event not found', 404);
  const canMod =
    event.hostId === moderator.id || moderator.role === 'ADMIN' || moderator.role === 'MODERATOR';
  if (!canMod) throw new AppError('FORBIDDEN', 'Not a moderator for this room', 403);

  return prisma.liveEventBan.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, reason },
    update: { reason },
  });
}

export async function isBannedFromEvent(eventId: string, userId: string) {
  const [ban, user] = await Promise.all([
    prisma.liveEventBan.findUnique({ where: { eventId_userId: { eventId, userId } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { bannedAt: true } }),
  ]);
  return Boolean(ban) || Boolean(user?.bannedAt);
}

export async function listUpcomingEvents(limit = 20) {
  const now = new Date();
  return prisma.liveEvent.findMany({
    where: {
      status: { in: ['SCHEDULED', 'LIVE'] },
      startsAt: { gte: new Date(now.getTime() - 2 * 3600_000) },
    },
    orderBy: { startsAt: 'asc' },
    take: limit,
    select: {
      id: true,
      title: true,
      startsAt: true,
      status: true,
      externalLiveUrl: true,
      pinnedBookId: true,
    },
  });
}
