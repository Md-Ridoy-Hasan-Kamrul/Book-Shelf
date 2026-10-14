import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createApp } from './app.js';
import { createLogger } from './lib/logger.js';
import { loadApiEnv } from './env.js';
import { prisma } from './lib/prisma.js';
import { cookieFromSetCookie, signUpAndSignIn } from './test/authHttp.js';
import { transitionOrderStatus } from './services/order/orderStateMachine.js';

const runIntegration =
  Boolean(process.env.DATABASE_URL) && process.env.HEALTH_SKIP_INFRA !== 'true';

describe.runIf(runIntegration)('checkout integration', () => {
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
  });

  async function readyBuyer() {
    const email = `checkout-${randomUUID()}@test.local`;
    const cookie = await signUpAndSignIn(baseUrl, email);
    const meRes = await fetch(`${baseUrl}/me`, { headers: { cookie } });
    const me = (await meRes.json()) as { data: { id: string } };
    await prisma.user.update({
      where: { id: me.data.id },
      data: { phone: '01711112222', phoneVerified: true, trustScore: 100 },
    });
    const addr = await prisma.address.create({
      data: {
        userId: me.data.id,
        label: 'Test',
        phone: '01711112222',
        division: 'Dhaka',
        district: 'Dhaka',
        area: 'Test',
        line1: 'Line 1',
        isDefault: true,
      },
    });
    return { cookie, userId: me.data.id, addressId: addr.id };
  }

  test('concurrent checkout: only one wins last unit', async () => {
    const listing = await prisma.listing.findFirst({
      where: { stock: 1, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    if (!listing) {
      throw new Error('Seed a listing with stock=1 (book index 199)');
    }
    await prisma.listing.update({
      where: { id: listing.id },
      data: { reservedQty: 0, stock: 1 },
    });

    const buyerA = await readyBuyer();
    const buyerB = await readyBuyer();
    const body = (addressId: string) =>
      JSON.stringify({
        items: [{ listingId: listing.id, qty: 1 }],
        addressId,
        paymentMethod: 'COD',
      });

    const [resA, resB] = await Promise.all([
      fetch(`${baseUrl}/checkout`, {
        method: 'POST',
        headers: {
          cookie: buyerA.cookie,
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID(),
        },
        body: body(buyerA.addressId),
      }),
      fetch(`${baseUrl}/checkout`, {
        method: 'POST',
        headers: {
          cookie: buyerB.cookie,
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID(),
        },
        body: body(buyerB.addressId),
      }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  test('duplicate Idempotency-Key returns same checkout', async () => {
    const listing = await prisma.listing.findFirst({
      where: { status: 'ACTIVE', stock: { gt: 2 } },
    });
    expect(listing).toBeTruthy();
    const buyer = await readyBuyer();
    const key = randomUUID();
    const headers = {
      cookie: buyer.cookie,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    };
    const payload = JSON.stringify({
      items: [{ listingId: listing!.id, qty: 1 }],
      addressId: buyer.addressId,
      paymentMethod: 'COD',
    });
    const first = await fetch(`${baseUrl}/checkout`, { method: 'POST', headers, body: payload });
    const second = await fetch(`${baseUrl}/checkout`, { method: 'POST', headers, body: payload });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const a = (await first.json()) as { data: { checkoutId: string } };
    const b = (await second.json()) as { data: { checkoutId: string } };
    expect(a.data.checkoutId).toBe(b.data.checkoutId);
  });

  test('client price tampering is ignored (server uses listing price)', async () => {
    const listing = await prisma.listing.findFirst({
      where: { status: 'ACTIVE', stock: { gt: 2 } },
    });
    const buyer = await readyBuyer();
    const quoteRes = await fetch(`${baseUrl}/checkout/quote`, {
      method: 'POST',
      headers: { cookie: buyer.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ listingId: listing!.id, qty: 1 }],
        addressId: buyer.addressId,
      }),
    });
    const quote = (await quoteRes.json()) as { data: { total: string } };
    const checkoutRes = await fetch(`${baseUrl}/checkout`, {
      method: 'POST',
      headers: {
        cookie: buyer.cookie,
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({
        items: [{ listingId: listing!.id, qty: 1 }],
        addressId: buyer.addressId,
        paymentMethod: 'COD',
        fakePrice: '1.00',
      }),
    });
    expect(checkoutRes.status).toBe(201);
    const out = (await checkoutRes.json()) as { data: { total: string } };
    expect(out.data.total).toBe(quote.data.total);
  });

  test('invalid order status transition is rejected', async () => {
    const order = await prisma.order.findFirst({ where: { status: 'DELIVERED' } });
    expect(order).toBeTruthy();
    await expect(
      prisma.$transaction((tx) =>
        transitionOrderStatus(tx, {
          orderId: order!.id,
          from: 'DELIVERED',
          to: 'PROCESSING',
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});
