import type { MeUser } from '@bookverse/shared';
import type { z } from 'zod';
import type { moderationActionSchema } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';

type ActionInput = z.infer<typeof moderationActionSchema>;

function assertModerator(user: MeUser) {
  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
    throw new AppError('FORBIDDEN', 'Moderator role required', 403);
  }
}

async function logAction(
  moderatorId: string,
  action: string,
  targetType: string,
  targetId: string,
  note?: string,
) {
  await prisma.moderationLog.create({
    data: { moderatorId, action, targetType, targetId, note },
  });
}

export async function applyModeration(user: MeUser, input: ActionInput) {
  assertModerator(user);

  if (input.targetType === 'POST') {
    if (input.action === 'HIDE') {
      await prisma.post.update({ where: { id: input.targetId }, data: { hiddenAt: new Date() } });
    } else if (input.action === 'REMOVE') {
      await prisma.post.update({
        where: { id: input.targetId },
        data: { deletedAt: new Date(), hiddenAt: new Date() },
      });
    } else if (input.action === 'RESTORE') {
      await prisma.post.update({
        where: { id: input.targetId },
        data: { deletedAt: null, hiddenAt: null },
      });
    }
  }

  if (input.targetType === 'COMMENT') {
    if (input.action === 'HIDE') {
      await prisma.comment.update({
        where: { id: input.targetId },
        data: { hiddenAt: new Date() },
      });
    } else if (input.action === 'REMOVE') {
      await prisma.comment.update({
        where: { id: input.targetId },
        data: { deletedAt: new Date(), hiddenAt: new Date() },
      });
    } else if (input.action === 'RESTORE') {
      await prisma.comment.update({
        where: { id: input.targetId },
        data: { deletedAt: null, hiddenAt: null },
      });
    }
  }

  if (input.targetType === 'USER') {
    if (input.action === 'WARN') {
      await prisma.user.update({
        where: { id: input.targetId },
        data: { moderationWarnings: { increment: 1 } },
      });
    } else if (input.action === 'SUSPEND') {
      const days = input.suspendDays ?? 7;
      await prisma.user.update({
        where: { id: input.targetId },
        data: { suspendedUntil: new Date(Date.now() + days * 86400_000) },
      });
    }
  }

  await logAction(user.id, input.action, input.targetType, input.targetId, input.note);
}

export async function listOpenReports(cursor?: string, limit = 20) {
  const { cursorWhere, encodeCursor } = await import('../../lib/cursorPagination.js');
  const take = limit + 1;
  const rows = await prisma.report.findMany({
    where: { status: 'OPEN', ...(cursorWhere(cursor) ?? {}) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page,
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}
