import {
  commentCreateSchema,
  feedQuerySchema,
  postCreateSchema,
  postUpdateSchema,
  reactionSchema,
  reportCreateSchema,
  successEnvelope,
} from '@bookverse/shared';
import { Router } from 'express';
import type { ApiEnv } from '@bookverse/shared';
import type { BookVerseAuth } from '../auth/createAuth.js';
import { consumeRateLimit } from '../lib/rateLimit.js';
import { paramId } from '../lib/params.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { createComment, listPostComments } from '../services/social/commentService.js';
import { getFeed } from '../services/social/feedService.js';
import { applyModeration, listOpenReports } from '../services/social/moderationService.js';
import {
  createPost,
  savePost,
  softDeletePost,
  unsavePost,
  updatePost,
} from '../services/social/postService.js';
import { setPostReaction } from '../services/social/reactionService.js';
import { moderationActionSchema } from '@bookverse/shared';
import { prisma } from '../lib/prisma.js';

export function createPostsRouter(auth: BookVerseAuth, env: ApiEnv) {
  const router = Router();

  router.get('/feed', optionalAuth(auth), async (req, res, next) => {
    try {
      const q = feedQuerySchema.parse(req.query);
      const viewer = (req as AuthedRequest).user?.id ?? null;
      const data = await getFeed(env, viewer, q.mode, q.cursor, q.limit);
      res.json(
        successEnvelope(
          { items: data.items },
          { nextCursor: data.nextCursor, queryCount: data.queryCount },
        ),
      );
    } catch (err) {
      next(err);
    }
  });

  router.post('/', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      await consumeRateLimit(env, `rl:post:${user.id}`, 30, 3600);
      const body = postCreateSchema.parse(req.body);
      const data = await createPost(user, env, body);
      res.status(201).json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/moderation/reports',
    requireAuth(auth),
    requireRole('ADMIN', 'MODERATOR'),
    async (_req, res, next) => {
      try {
        const data = await listOpenReports();
        res.json(successEnvelope(data));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/moderation/actions',
    requireAuth(auth),
    requireRole('ADMIN', 'MODERATOR'),
    async (req, res, next) => {
      try {
        const user = (req as AuthedRequest).user;
        const body = moderationActionSchema.parse(req.body);
        await applyModeration(user, body);
        res.json(successEnvelope({ applied: true }));
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch('/:id', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = postUpdateSchema.parse(req.body);
      const data = await updatePost(user, paramId(req.params.id), body);
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      await softDeletePost(user, paramId(req.params.id));
      res.json(successEnvelope({ deleted: true }));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/save', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      await savePost(user.id, paramId(req.params.id));
      res.json(successEnvelope({ saved: true }));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id/save', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      await unsavePost(user.id, paramId(req.params.id));
      res.json(successEnvelope({ saved: false }));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/react', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = reactionSchema.parse(req.body);
      await setPostReaction(user.id, paramId(req.params.id), body.kind);
      res.json(successEnvelope({ ok: true }));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/comments', async (req, res, next) => {
    try {
      const data = await listPostComments(paramId(req.params.id));
      res.json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/comments', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      await consumeRateLimit(env, `rl:comment:${user.id}`, 60, 3600);
      const body = commentCreateSchema.parse(req.body);
      const data = await createComment(user, paramId(req.params.id), body);
      res.status(201).json(successEnvelope(data));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/report', requireAuth(auth), async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const body = reportCreateSchema.parse(req.body);
      await prisma.report.create({
        data: {
          reporterId: user.id,
          targetType: 'POST',
          targetId: paramId(req.params.id),
          reason: body.reason,
        },
      });
      res.status(201).json(successEnvelope({ reported: true }));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
