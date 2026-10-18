import { successEnvelope } from '@bookverse/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { paramId } from '../lib/params.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { prisma } from '../lib/prisma.js';
import { cursorWhere, encodeCursor } from '../lib/cursorPagination.js';
import { ensureNotificationPreferences } from '../services/retention/notificationPreferenceService.js';

const listQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const prefPatchSchema = z.object({
  channel: z.enum(['IN_APP', 'EMAIL', 'SMS', 'PUSH']),
  enabled: z.boolean(),
});

export function createNotificationsRouter(auth: BookVerseAuth) {
  const router = Router();

  router.get('/unread-count', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const count = await prisma.notification.count({
        where: { userId: user.id, channel: 'IN_APP', readAt: null },
      });
      res.json(successEnvelope({ count }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const q = listQuery.parse(req.query);
      const take = q.limit + 1;
      const rows = await prisma.notification.findMany({
        where: {
          userId: user.id,
          channel: 'IN_APP',
          ...(cursorWhere(q.cursor) ?? {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
      });
      const page = rows.slice(0, q.limit);
      const last = page[page.length - 1];
      res.json(
        successEnvelope(
          {
            items: page.map((n) => ({
              id: n.id,
              title: n.title,
              body: n.body,
              readAt: n.readAt?.toISOString() ?? null,
              createdAt: n.createdAt.toISOString(),
            })),
            nextCursor:
              rows.length > q.limit && last ? encodeCursor(last.createdAt, last.id) : null,
          },
          {
            nextCursor:
              rows.length > q.limit && last ? encodeCursor(last.createdAt, last.id) : null,
          },
        ),
      );
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/read', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      await prisma.notification.updateMany({
        where: { id: paramId(req.params.id), userId: user.id },
        data: { readAt: new Date() },
      });
      res.json(successEnvelope({ read: true }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/preferences', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      await ensureNotificationPreferences(user.id);
      const prefs = await prisma.notificationPreference.findMany({ where: { userId: user.id } });
      res.json(successEnvelope(prefs));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/preferences', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = prefPatchSchema.parse(req.body);
      const updated = await prisma.notificationPreference.upsert({
        where: { userId_channel: { userId: user.id, channel: body.channel } },
        create: { userId: user.id, channel: body.channel, enabled: body.enabled },
        update: { enabled: body.enabled },
      });
      res.json(successEnvelope(updated));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
