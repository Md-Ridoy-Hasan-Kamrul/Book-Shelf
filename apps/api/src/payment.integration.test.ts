import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { toPaisa } from '@bookverse/shared';
import { createApp } from './app.js';
import { createLogger } from './lib/logger.js';
import { loadApiEnv } from './env.js';
import { prisma } from './lib/prisma.js';
import { cookieFromSetCookie, signUpAndSignIn } from './test/authHttp.js';
import { releaseDueEscrowEntries } from './services/money/escrowService.js';
import { reconcileOrdersVsLedger } from './services/money/reconcileService.js';

const runIntegration =
  Boolean(process.env.DATABASE_URL) && process.env.HEALTH_SKIP_INFRA !== 'true';

describe.runIf(runIntegration)('payment & ledger', () => {
  let server: Server;
  let baseUrl: string;
  let env: ReturnType<typeof loadApiEnv>;

  beforeAll(async () => {
    env = loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'false', PAYMENT_PROVIDER: 'mock' });
    const app = createApp(env, createLogger(env));
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function onlineCheckout() {
    const email = `pay-${randomUUID()}@test.local`;
    const cookie = await signUpAndSignIn(baseUrl, email);
    const me = (await (await fetch(`${baseUrl}/me`, { headers: { cookie } })).json()) as {
      data: { id: string };
    };
    await prisma.user.update({
      where: { id: me.data.id },
      data: { phoneVerified: true, phone: '01700001111' },
    });
    const addr = await prisma.address.create({
      data: {
        userId: me.data.id,
        label: 'Home',
        phone: '01700001111',
        division: 'Dhaka',
        district: 'Dhaka',
        area: 'X',
        line1: 'Y',
      },
    });
    const listing = await prisma.listing.findFirst({
      where: { status: 'ACTIVE', stock: { gt: 2 } },
    });
    expect(listing).toBeTruthy();
    const checkoutRes = await fetch(`${baseUrl}/checkout`, {
      method: 'POST',
      headers: {
        cookie,
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({
        items: [{ listingId: listing!.id, qty: 1 }],
        addressId: addr.id,
        paymentMethod: 'ONLINE',
      }),
    });
    expect(checkoutRes.status).toBe(201);
    const checkout = (await checkoutRes.json()) as { data: { checkoutId: string } };
    const init = await fetch(`${baseUrl}/payments/initiate`, {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutId: checkout.data.checkoutId }),
    });
    const initBody = (await init.json()) as { data: { tranId: string } };
    const intent = await prisma.paymentIntent.findUniqueOrThrow({
      where: { tranId: initBody.data.tranId },
    });
    return {
      cookie,
      tranId: initBody.data.tranId,
      amount: intent.amount.toString(),
      orderId: checkout.data.checkoutId,
    };
  }

  async function postIpn(tranId: string, amount: string, valId: string) {
    return fetch(`${baseUrl}/webhooks/payment/mock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        status: 'VALID',
        tran_id: tranId,
        val_id: valId,
        amount,
        currency: 'BDT',
      }),
    });
  }

  test('duplicate IPN is a no-op', async () => {
    const { tranId, amount } = await onlineCheckout();
    const val = `dup-${randomUUID()}`;
    expect((await postIpn(tranId, amount, val)).status).toBe(200);
    expect((await postIpn(tranId, amount, val)).status).toBe(200);
    const events = await prisma.paymentEvent.count({ where: { eventId: val } });
    expect(events).toBe(1);
  });

  test('wrong amount rejected', async () => {
    const { tranId } = await onlineCheckout();
    const res = await postIpn(tranId, '1.00', `bad-${randomUUID()}`);
    expect(res.status).toBe(200);
    const intent = await prisma.paymentIntent.findUniqueOrThrow({ where: { tranId } });
    expect(intent.status).not.toBe('COMPLETED');
  });

  test('IPN creates ledger and reconcile passes after deliver + escrow clock', async () => {
    const { tranId, amount } = await onlineCheckout();
    await postIpn(tranId, amount, `ok-${randomUUID()}`);
    const intent = await prisma.paymentIntent.findUniqueOrThrow({
      where: { tranId },
      include: { checkout: { include: { orders: true } } },
    });
    const orderId = intent.checkout.orders[0]!.id;
    const { adminTransitionOrder } = await import('./services/order/orderService.js');
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    expect(admin).toBeTruthy();
    for (const status of ['SHIPPED', 'DELIVERED'] as const) {
      await adminTransitionOrder(env, admin!.id, orderId, status, 'test');
    }

    process.env.TEST_CLOCK_ISO = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    await releaseDueEscrowEntries(env);
    const rec = await reconcileOrdersVsLedger();
    expect(rec.ok).toBe(true);

    const saleSum = await prisma.ledgerEntry.aggregate({
      where: { orderId, kind: { in: ['SALE', 'COMMISSION'] } },
      _sum: { amount: true },
    });
    expect(toPaisa(saleSum._sum.amount?.toString() ?? '0')).toBeGreaterThan(0n);
  });

  test('claim freezes escrow release', async () => {
    const { tranId, amount } = await onlineCheckout();
    await postIpn(tranId, amount, `claim-${randomUUID()}`);
    const order = await prisma.order.findFirstOrThrow({
      where: { checkout: { paymentIntent: { tranId } } },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
    await prisma.ledgerEntry.updateMany({
      where: { orderId: order.id },
      data: { availableAt: new Date(Date.now() - 1000) },
    });
    await prisma.claim.create({
      data: { orderId: order.id, reason: 'Test claim freeze', images: [], status: 'OPEN' },
    });
    await prisma.order.update({ where: { id: order.id }, data: { status: 'DISPUTED' } });
    const before = await prisma.ledgerEntry.count({
      where: { orderId: order.id, status: 'AVAILABLE' },
    });
    await releaseDueEscrowEntries(env);
    const after = await prisma.ledgerEntry.count({
      where: { orderId: order.id, status: 'AVAILABLE' },
    });
    expect(after).toBe(before);
  });
});
