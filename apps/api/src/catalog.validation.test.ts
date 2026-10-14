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

test('GET /search?q= returns empty list without hitting DB', async () => {
  const res = await fetch(`${baseUrl}/search?q=`);
  expect(res.status).toBe(200);
  const body = (await res.json()) as { success: boolean; data: { items: unknown[] } };
  expect(body.success).toBe(true);
  expect(body.data.items).toEqual([]);
});

test('GET /books rejects invalid query params', async () => {
  const res = await fetch(`${baseUrl}/books?limit=not-a-number`);
  expect(res.status).toBe(400);
  expect(await res.json()).toMatchObject({ success: false });
});
