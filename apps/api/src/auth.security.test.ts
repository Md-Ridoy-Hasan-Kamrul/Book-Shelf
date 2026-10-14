import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { createApp } from './app.js';
import { createLogger } from './lib/logger.js';
import { loadApiEnv } from './env.js';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const env = loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'true' });
  const app = createApp(env, createLogger(env));
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('PATCH /users/me without session is 401', async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'ADMIN' }),
  });
  expect(res.status).toBe(401);
});

test('GET /me without session is 401', async () => {
  const res = await fetch(`${baseUrl}/me`);
  expect(res.status).toBe(401);
  const body = await res.json();
  expect(body.success).toBe(false);
});

test('admin role-applications approve without auth is 401', async () => {
  const res = await fetch(`${baseUrl}/role-applications/x/approve`, { method: 'POST' });
  expect(res.status).toBe(401);
});
