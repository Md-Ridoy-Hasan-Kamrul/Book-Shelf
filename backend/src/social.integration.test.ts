import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from './lib/prisma.js';
import { getFeed } from './services/social/feedService.js';
import { setPostReaction } from './services/social/reactionService.js';
import { loadApiEnv } from './env.js';

const runDb = Boolean(process.env.DATABASE_URL) && process.env.HEALTH_SKIP_INFRA !== 'true';

describe.runIf(runDb)('social feed (P11)', () => {
  const env = loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'false' });

  it('hides posts from blocked authors', async () => {
    const a = await prisma.user.findFirst({ where: { role: 'USER' } });
    const b = await prisma.user.findFirst({
      where: { role: 'USER', id: { not: a?.id } },
    });
    expect(a && b).toBeTruthy();
    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: a!.id, blockedId: b!.id } },
      create: { blockerId: a!.id, blockedId: b!.id },
      update: {},
    });
    const post = await prisma.post.create({
      data: { authorId: b!.id, type: 'TEXT', body: `blocked-test-${randomUUID()}` },
    });
    const feed = await getFeed(env, a!.id, 'mixed', undefined, 50);
    expect(feed.items.some((p) => p.id === post.id)).toBe(false);
    await prisma.block.deleteMany({ where: { blockerId: a!.id, blockedId: b!.id } });
  });

  it('like counter stays consistent under sequential toggles', async () => {
    const user = await prisma.user.findFirst({ where: { role: 'USER' } });
    const author = await prisma.user.findFirst({
      where: { role: 'WRITER', id: { not: user?.id } },
    });
    expect(user && author).toBeTruthy();
    const post = await prisma.post.create({
      data: { authorId: author!.id, type: 'TEXT', body: 'like test post content here' },
    });
    await setPostReaction(user!.id, post.id, 'LIKE');
    await setPostReaction(user!.id, post.id, 'LIKE');
    const row = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(row.likeCount).toBe(0);
    await setPostReaction(user!.id, post.id, 'LIKE');
    const row2 = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(row2.likeCount).toBe(1);
  });
});
