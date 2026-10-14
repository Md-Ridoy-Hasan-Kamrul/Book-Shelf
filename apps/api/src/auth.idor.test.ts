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

describe.runIf(runDb)('auth IDOR + escalation (HTTP)', () => {
  let server: Server;
  let baseUrl: string;
  let cookieA: string;
  let cookieB: string;
  let appId: string;

  beforeAll(async () => {
    const env = loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'false' });
    const app = createApp(env, createLogger(env));
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const emailA = `a-${randomUUID()}@idor.test`;
    const emailB = `b-${randomUUID()}@idor.test`;
    cookieA = await signUpAndSignIn(baseUrl, emailA);
    cookieB = await signUpAndSignIn(baseUrl, emailB);

    const create = await fetch(`${baseUrl}/role-applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        type: 'WRITER',
        documents: ['local://doc/a.pdf'],
        note: 'A application',
      }),
    });
    expect(create.status).toBe(201);
    const body = (await create.json()) as { data: { id: string } };
    appId = body.data.id;
  });

  afterAll(async () => {
    await prisma.roleApplication.deleteMany({ where: { id: appId } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  it('user B cannot read user A role application (403)', async () => {
    const res = await fetch(`${baseUrl}/role-applications/${appId}`, {
      headers: { Cookie: cookieB },
    });
    expect(res.status).toBe(403);
  });

  it('USER cannot call admin approve (403)', async () => {
    const res = await fetch(`${baseUrl}/role-applications/${appId}/approve`, {
      method: 'POST',
      headers: { Cookie: cookieB },
    });
    expect(res.status).toBe(403);
  });

  it('authenticated user cannot PATCH own role to ADMIN (403)', async () => {
    const res = await fetch(`${baseUrl}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ role: 'ADMIN' }),
    });
    expect(res.status).toBe(403);
  });

  it('PUBLISHER session cannot follow USER (403)', async () => {
    const pubEmail = `pub-${randomUUID()}@idor.test`;
    const pubCookie = await signUpAndSignIn(baseUrl, pubEmail);
    const pubUser = await prisma.user.findFirst({ where: { email: pubEmail } });
    expect(pubUser).toBeTruthy();
    await prisma.user.update({
      where: { id: pubUser!.id },
      data: { role: UserRole.PUBLISHER },
    });

    const target = await prisma.user.findFirst({
      where: { email: { contains: '@idor.test' }, role: UserRole.USER },
    });
    expect(target).toBeTruthy();

    const res = await fetch(`${baseUrl}/users/${target!.id}/follow`, {
      method: 'POST',
      headers: { Cookie: pubCookie },
    });
    expect(res.status).toBe(403);
  });
});
