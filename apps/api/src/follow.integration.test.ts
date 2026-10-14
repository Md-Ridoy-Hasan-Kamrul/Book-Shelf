import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient, UserRole } from '@prisma/client';
import { createApp } from './app.js';
import { createLogger } from './lib/logger.js';
import { loadApiEnv } from './env.js';
import { signUpAndSignIn } from './test/authHttp.js';

const prisma = new PrismaClient();
const runIntegration = process.env.DATABASE_URL && process.env.HEALTH_SKIP_INFRA !== 'true';

describe.runIf(runIntegration)('follow — transaction + policy', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const env = loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'false' });
    const app = createApp(env, createLogger(env));
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  it('parallel follow requests do not throw (single edge)', async () => {
    const writerId = randomUUID();
    await prisma.user.create({
      data: {
        id: writerId,
        name: 'W',
        email: `w-${writerId}@race.test`,
        role: UserRole.WRITER,
      },
    });

    const cookie = await signUpAndSignIn(baseUrl, `race-${randomUUID()}@race.test`);

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        fetch(`${baseUrl}/users/${writerId}/follow`, {
          method: 'POST',
          headers: { Cookie: cookie },
        }),
      ),
    );

    const statuses = results.map((r) => r.status);
    expect(statuses.every((s) => s === 201 || s === 403)).toBe(true);
    expect(statuses.filter((s) => s === 201).length).toBeGreaterThanOrEqual(1);

    const edges = await prisma.follow.count({
      where: { followerId: { not: writerId }, followingId: writerId },
    });
    expect(edges).toBeGreaterThanOrEqual(1);

    await prisma.follow.deleteMany({
      where: { OR: [{ followerId: writerId }, { followingId: writerId }] },
    });
    await prisma.user.deleteMany({ where: { id: writerId } });
  });
});
