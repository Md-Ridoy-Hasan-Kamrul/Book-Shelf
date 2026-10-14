import { randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { loadApiEnv } from '../env.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/appError.js';
import { followUser, unfollowUser } from './followService.js';

const env = loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'true' });
const runDb = Boolean(process.env.DATABASE_URL) && process.env.HEALTH_SKIP_INFRA !== 'true';

describe.runIf(runDb)('followUser service', () => {
  it('rejects PUBLISHER following USER with 403', async () => {
    const publisherId = randomUUID();
    const userId = randomUUID();
    await prisma.user.createMany({
      data: [
        {
          id: publisherId,
          name: 'Pub',
          email: `pub-${publisherId}@svc.test`,
          role: UserRole.PUBLISHER,
        },
        {
          id: userId,
          name: 'U',
          email: `u-${userId}@svc.test`,
          role: UserRole.USER,
        },
      ],
    });

    await expect(followUser(env, publisherId, userId)).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && err.statusCode === 403,
    );

    await prisma.user.deleteMany({ where: { id: { in: [publisherId, userId] } } });
  });

  it('unfollow removes writer follow-back edge', async () => {
    const writerId = randomUUID();
    const userId = randomUUID();
    await prisma.user.createMany({
      data: [
        { id: writerId, name: 'W', email: `w-${writerId}@fb.test`, role: UserRole.WRITER },
        { id: userId, name: 'U', email: `u-${userId}@fb.test`, role: UserRole.USER },
      ],
    });

    await followUser(env, userId, writerId);
    const backBefore = await prisma.follow.count({
      where: { followerId: writerId, followingId: userId },
    });
    expect(backBefore).toBe(1);

    await unfollowUser(env, userId, writerId);
    const backAfter = await prisma.follow.count({
      where: { followerId: writerId, followingId: userId },
    });
    expect(backAfter).toBe(0);

    await prisma.user.deleteMany({ where: { id: { in: [writerId, userId] } } });
  });
});
