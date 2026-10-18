import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { fromPaisa, splitCommission, toPaisa } from '@bookverse/shared';
import { createApp } from './app.js';
import { createLogger } from './lib/logger.js';
import { loadApiEnv } from './env.js';
import { prisma } from './lib/prisma.js';
import { createMockCourierProvider } from './providers/courier/mock.js';
import { createShipmentForOrder } from './services/courier/shipmentService.js';
import { processCourierWebhook } from './services/courier/courierWebhookService.js';

const runIntegration =
  Boolean(process.env.DATABASE_URL) && process.env.HEALTH_SKIP_INFRA !== 'true';

const secret = 'local-mock-courier-secret';

describe.runIf(runIntegration)('courier webhooks (mock)', () => {
  let server: Server;
  let baseUrl: string;
  let env: ReturnType<typeof loadApiEnv>;

  beforeAll(async () => {
    process.env.MOCK_COURIER_WEBHOOK_SECRET = secret;
    env = loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'false', COURIER_PROVIDER: 'mock' });
    const app = createApp(env, createLogger(env));
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function shipmentReadyOrder() {
    const buyer = await prisma.user.findFirstOrThrow({ where: { role: 'USER' } });
    const addr = await prisma.address.findFirstOrThrow({ where: { userId: buyer.id } });
    const listing = await prisma.listing.findFirstOrThrow({
      where: { status: 'ACTIVE', stock: { gt: 2 } },
      include: { book: true },
    });
    const linePaisa = toPaisa(listing.price.toString());
    const { sellerPaisa, commissionPaisa } = splitCommission(linePaisa, 800);
    const checkout = await prisma.checkout.create({
      data: {
        buyerId: buyer.id,
        paymentMethod: 'COD',
        status: 'COMPLETED',
        shippingAddressId: addr.id,
        idempotencyKey: `courier-test-${randomUUID()}`,
      },
    });
    const order = await prisma.order.create({
      data: {
        checkoutId: checkout.id,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        status: 'PACKED',
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        subtotal: listing.price,
        shippingFee: '60.00',
        discount: '0.00',
        total: (Number(listing.price) + 60).toFixed(2),
        shippingAddressId: addr.id,
        lineItems: {
          create: {
            listingId: listing.id,
            bookId: listing.bookId,
            titleSnap: listing.book.title,
            unitPrice: listing.price,
            qty: 1,
            lineTotal: listing.price,
            sellerId: listing.sellerId,
            commissionBps: 800,
            commissionAmount: fromPaisa(commissionPaisa),
            sellerAmount: fromPaisa(sellerPaisa),
          },
        },
        statusHistory: {
          create: [
            { status: 'PROCESSING', note: 'Test' },
            { status: 'PACKED', note: 'Test packed' },
          ],
        },
      },
    });
    const courier = createMockCourierProvider(env);
    await createShipmentForOrder(env, courier, order.id);
    const shipment = await prisma.shipment.findUniqueOrThrow({ where: { orderId: order.id } });
    return { orderId: order.id, consignmentId: shipment.consignmentId };
  }

  test('rejects invalid signature via HTTP', async () => {
    const { consignmentId } = await shipmentReadyOrder();
    const res = await fetch(`${baseUrl}/webhooks/courier/mock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-mock-signature': 'bad' },
      body: JSON.stringify({
        consignment_id: consignmentId,
        status: 'DELIVERED',
        updated_at: new Date().toISOString(),
      }),
    });
    expect(res.status).toBe(401);
  });

  test('valid webhook delivers; duplicate is idempotent', async () => {
    const { orderId, consignmentId } = await shipmentReadyOrder();
    const updatedAt = new Date().toISOString();
    const body = {
      consignment_id: consignmentId,
      status: 'DELIVERED',
      updated_at: updatedAt,
    };
    const headers = { 'x-mock-signature': secret };

    const courier = createMockCourierProvider(env);
    const r1 = await processCourierWebhook(env, courier, headers, body);
    expect(r1.kind).toBe('processed');

    let order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('DELIVERED');

    const r2 = await processCourierWebhook(env, courier, headers, body);
    expect(r2.kind).toBe('duplicate');
    order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('DELIVERED');
  });

  test('out-of-order DELIVERED from SHIPPED still completes', async () => {
    const { orderId, consignmentId } = await shipmentReadyOrder();
    const courier = createMockCourierProvider(env);
    const headers = { 'x-mock-signature': secret };
    await processCourierWebhook(env, courier, headers, {
      consignment_id: consignmentId,
      status: 'DELIVERED',
      updated_at: new Date().toISOString(),
    });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('DELIVERED');
    expect(order.deliveredAt).toBeTruthy();
  });
});
