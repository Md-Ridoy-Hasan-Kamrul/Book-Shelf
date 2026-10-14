import { randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { blockUser } from './blockService.js';
import { followUser } from './followService.js';
import { loadApiEnv } from '../env.js';

const env = loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'true' });
const runDb = Boolean(process.env.DATABASE_URL) && process.env.HEALTH_SKIP_INFRA !== 'true';

describe.runIf(runDb)('blockUser removes both follow directions', () => {
  it('clears follows when blocking', async () => {
    const a = randomUUID();
    const b = randomUUID();
    await prisma.user.createMany({
      data: [
        { id: a, name: 'A', email: `a-${a}@block.test`, role: UserRole.USER },
        { id: b, name: 'B', email: `b-${b}@block.test`, role: UserRole.USER },
      ],
    });

    await followUser(env, a, b);
    await blockUser(a, b);

    const count = await prisma.follow.count({
      where: {
        OR: [
          { followerId: a, followingId: b },
          { followerId: b, followingId: a },
        ],
      },
    });
    expect(count).toBe(0);

    await prisma.block.deleteMany({ where: { blockerId: a } });
    await prisma.user.deleteMany({ where: { id: { in: [a, b] } } });
  });
});
