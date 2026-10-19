import type { Server as HttpServer } from 'node:http';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server, type Socket } from 'socket.io';
import type { ApiEnv } from '@bookverse/shared';
import type { Logger } from '../lib/logger.js';
import { createBullmqConnection } from '../lib/bullmqConnection.js';
import { prisma } from '../lib/prisma.js';
import { isBannedFromEvent } from '../services/writer/liveEventService.js';
import { consumeRateLimit } from '../lib/rateLimit.js';

type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  body: string;
  at: string;
};

const MSG_HISTORY = 80;

export function attachLiveRoom(httpServer: HttpServer, env: ApiEnv, logger: Logger) {
  if (!env.FEATURE_LIVE_EVENTS) {
    logger.info('FEATURE_LIVE_EVENTS off — skipping Socket.io live room');
    return null;
  }

  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: env.WEB_ORIGIN, credentials: true },
    transports: ['websocket', 'polling'],
  });

  try {
    const pub = createBullmqConnection(env);
    const sub = createBullmqConnection(env);
    io.adapter(createAdapter(pub, sub));
    logger.info('Socket.io Redis adapter attached');
  } catch (err) {
    logger.warn({ err }, 'Socket.io Redis adapter failed — single-node only');
  }

  const history = new Map<string, ChatMessage[]>();

  io.on('connection', (socket: Socket) => {
    socket.on('join', async (payload: { eventId: string; userId?: string; userName?: string }) => {
      try {
        const event = await prisma.liveEvent.findUnique({ where: { id: payload.eventId } });
        if (!event || event.status === 'ENDED') {
          socket.emit('error_msg', { code: 'NOT_FOUND', message: 'Event not found' });
          return;
        }
        if (payload.userId && (await isBannedFromEvent(payload.eventId, payload.userId))) {
          socket.emit('error_msg', { code: 'BANNED', message: 'Banned from this room' });
          return;
        }
        await socket.join(`event:${payload.eventId}`);
        socket.data.eventId = payload.eventId;
        socket.data.userId = payload.userId;
        socket.data.userName = payload.userName ?? 'Guest';

        const msgs = history.get(payload.eventId) ?? [];
        socket.emit('history', msgs);
        socket.emit('room_state', {
          eventId: event.id,
          status: event.status,
          startsAt: event.startsAt.toISOString(),
          serverNow: new Date().toISOString(),
          msUntilStart: Math.max(0, event.startsAt.getTime() - Date.now()),
          pinnedBookId: event.pinnedBookId,
          externalLiveUrl: event.externalLiveUrl,
        });
      } catch (err) {
        logger.warn({ err }, 'join failed');
      }
    });

    socket.on('chat', async (payload: { body: string }) => {
      const eventId = socket.data.eventId as string | undefined;
      const userId = socket.data.userId as string | undefined;
      if (!eventId || !userId) {
        socket.emit('error_msg', { code: 'UNAUTHORIZED', message: 'Login required to chat' });
        return;
      }
      if (await isBannedFromEvent(eventId, userId)) {
        socket.emit('error_msg', { code: 'BANNED', message: 'Banned from this room' });
        return;
      }
      try {
        await consumeRateLimit(env, `live-chat:${userId}`, 20, 60);
      } catch {
        socket.emit('error_msg', { code: 'RATE_LIMITED', message: 'Slow down' });
        return;
      }
      const body = String(payload.body ?? '')
        .trim()
        .slice(0, 400);
      if (body.length < 1) return;

      const msg: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId,
        userName: String(socket.data.userName ?? 'User'),
        body,
        at: new Date().toISOString(),
      };
      const list = history.get(eventId) ?? [];
      list.push(msg);
      if (list.length > MSG_HISTORY) list.shift();
      history.set(eventId, list);
      io.to(`event:${eventId}`).emit('chat', msg);
    });

    socket.on('question', async (payload: { body: string }) => {
      const eventId = socket.data.eventId as string | undefined;
      const userId = socket.data.userId as string | undefined;
      if (!eventId || !userId) return;
      if (await isBannedFromEvent(eventId, userId)) {
        socket.emit('error_msg', { code: 'BANNED', message: 'Banned from this room' });
        return;
      }
      try {
        await consumeRateLimit(env, `live-q:${userId}`, 5, 60);
        const q = await prisma.liveEventQuestion.create({
          data: {
            eventId,
            userId,
            body: String(payload.body ?? '')
              .trim()
              .slice(0, 500),
          },
        });
        io.to(`event:${eventId}`).emit('question', {
          id: q.id,
          body: q.body,
          userName: socket.data.userName,
          createdAt: q.createdAt.toISOString(),
        });
      } catch {
        socket.emit('error_msg', { code: 'RATE_LIMITED', message: 'Question rate limited' });
      }
    });

    socket.on('disconnect', () => {
      /* reconnect clients re-join and receive history — stable reconnect */
    });
  });

  return io;
}
