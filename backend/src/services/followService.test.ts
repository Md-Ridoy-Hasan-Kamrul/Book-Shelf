import { randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { loadApiEnv } from '../env.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/appError.js';
import { bumpMassFollowRisk, followUser, unfollowUser } from './followService.js';

const env = loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'true' });
const runDb = Boolean(process.env.DATABASE_URL) && process.env.HEALTH_SKIP_INFRA !== 'true';

describe.runIf(runDb)('followUser service (Appendix B)', () => {
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

  it('USER→WRITER does not auto-create writer follow-back', async () => {
    const writerId = randomUUID();
    const userId = randomUUID();
    await prisma.user.createMany({
      data: [
        { id: writerId, name: 'W', email: `w-${writerId}@fb.test`, role: UserRole.WRITER },
        { id: userId, name: 'U', email: `u-${userId}@fb.test`, role: UserRole.USER },
      ],
    });

    await followUser(env, userId, writerId);
    const back = await prisma.follow.count({
      where: { followerId: writerId, followingId: userId },
    });
    expect(back).toBe(0);

    await prisma.follow.deleteMany({
      where: { OR: [{ followerId: userId }, { followingId: userId }] },
    });
    await prisma.user.deleteMany({ where: { id: { in: [writerId, userId] } } });
  });

  it('WRITER→USER allowed only after user follows; unfollow removes back', async () => {
    const writerId = randomUUID();
    const userId = randomUUID();
    await prisma.user.createMany({
      data: [
        { id: writerId, name: 'W', email: `w-${writerId}@fb2.test`, role: UserRole.WRITER },
        { id: userId, name: 'U', email: `u-${userId}@fb2.test`, role: UserRole.USER },
      ],
    });

    await expect(followUser(env, writerId, userId)).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 403 &&
        String(err.message).includes('FOLLOW_BACK_ONLY'),
    );

    await followUser(env, userId, writerId);
    await followUser(env, writerId, userId);
    const both = await prisma.follow.count({
      where: {
        OR: [
          { followerId: userId, followingId: writerId },
          { followerId: writerId, followingId: userId },
        ],
      },
    });
    expect(both).toBe(2);

    await unfollowUser(env, userId, writerId);
    const backAfter = await prisma.follow.count({
      where: { followerId: writerId, followingId: userId },
    });
    expect(backAfter).toBe(0);

    await prisma.user.deleteMany({ where: { id: { in: [writerId, userId] } } });
  });

  it('bumpMassFollowRisk lowers trustScore and never bans', async () => {
    const userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        name: 'Risk',
        email: `risk-${userId}@svc.test`,
        role: UserRole.USER,
        trustScore: 50,
      },
    });
    await bumpMassFollowRisk(userId);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(u.trustScore).toBe(49);
    expect(u.bannedAt).toBeNull();
    await prisma.user.delete({ where: { id: userId } });
  });
});
