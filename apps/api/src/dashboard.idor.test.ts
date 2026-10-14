import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { PrismaClient, UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { createLogger } from './lib/logger.js';
import { loadApiEnv } from './env.js';
import { signUpAndSignIn } from './test/authHttp.js';

const prisma = new PrismaClient();
const runDb = Boolean(process.env.DATABASE_URL) && process.env.HEALTH_SKIP_INFRA !== 'true';

describe.runIf(runDb)('dashboard IDOR', () => {
  let server: Server;
  let baseUrl: string;
  let cookieUser: string;
  let cookiePubA: string;
  let orderOtherId: string;
  let pubAId: string;

  beforeAll(async () => {
    const env = loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'false' });
    const app = createApp(env, createLogger(env));
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    cookieUser = await signUpAndSignIn(baseUrl, `user-${randomUUID()}@dash.test`);
    const pubAEmail = `puba-${randomUUID()}@dash.test`;
    cookiePubA = await signUpAndSignIn(baseUrl, pubAEmail);
    const pubA = await prisma.user.findFirst({ where: { email: pubAEmail } });
    expect(pubA).toBeTruthy();
    pubAId = pubA!.id;
    await prisma.user.update({ where: { id: pubAId }, data: { role: UserRole.PUBLISHER } });
    await prisma.publisherProfile.create({
      data: {
        userId: pubAId,
        businessName: 'Test Pub A',
        slug: `test-pub-a-${randomUUID().slice(0, 6)}`,
      },
    });

    const otherPub = await prisma.user.findFirst({
      where: { role: UserRole.PUBLISHER, id: { not: pubAId } },
    });
    expect(otherPub).toBeTruthy();
    const orderOther = await prisma.order.findFirst({
      where: { sellerId: otherPub!.id },
      select: { id: true },
    });
    expect(orderOther).toBeTruthy();
    orderOtherId = orderOther!.id;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  it('USER cannot access seller dashboard overview (403)', async () => {
    const res = await fetch(`${baseUrl}/seller/dashboard/overview`, {
      headers: { Cookie: cookieUser },
    });
    expect(res.status).toBe(403);
  });

  it('seller A cannot read seller B order detail (404)', async () => {
    const res = await fetch(`${baseUrl}/seller/dashboard/orders/${orderOtherId}`, {
      headers: { Cookie: cookiePubA },
    });
    expect(res.status).toBe(404);
  });

  it('non-admin cannot access admin KPIs (403)', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard/kpis`, {
      headers: { Cookie: cookieUser },
    });
    expect(res.status).toBe(403);
  });
});
