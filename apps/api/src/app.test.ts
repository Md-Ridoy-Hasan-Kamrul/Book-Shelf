import { healthResponseSchema } from '@bookverse/shared';
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

test('GET /health returns API envelope with infra flags', async () => {
  const res = await fetch(`${baseUrl}/health`);
  expect(res.status).toBe(200);
  const body = healthResponseSchema.parse(await res.json());
  expect(body.data.status).toBe('ok');
  expect(body.data.db).toBe(true);
  expect(body.data.redis).toBe(true);
});

test('unknown route returns 404 envelope', async () => {
  const res = await fetch(`${baseUrl}/nope`);
  expect(res.status).toBe(404);
  expect(await res.json()).toMatchObject({
    success: false,
    code: 'NOT_FOUND',
  });
});

test('invalid env is rejected', () => {
  expect(() => loadApiEnv({ PORT: 'abc' })).toThrow(/Invalid API environment/);
});
