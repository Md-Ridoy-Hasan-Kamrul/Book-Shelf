import type { ApiEnv } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import type { CourierProvider } from '../../providers/courier/types.js';
import { transitionOrderStatus } from '../order/orderStateMachine.js';

export async function markOrderPacked(sellerId: string, orderId: string, env: ApiEnv) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, sellerId },
  });
  if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
  if (order.status !== 'PROCESSING') {
    throw new AppError('INVALID_TRANSITION', 'Order must be PROCESSING to pack', 409);
  }

  await prisma.$transaction(async (tx) => {
    await transitionOrderStatus(tx, {
      orderId,
      from: 'PROCESSING',
      to: 'PACKED',
      actorId: sellerId,
      note: 'Seller marked packed',
    });
  });

  const { scheduleCreateShipment } = await import('../../jobs/courierQueue.js');
  await scheduleCreateShipment(env, orderId);
}

export async function createShipmentForOrder(
  env: ApiEnv,
  courier: CourierProvider,
  orderId: string,
): Promise<void> {
  const existing = await prisma.shipment.findUnique({ where: { orderId } });
  if (existing && !existing.consignmentId.startsWith('failed-')) return;
  if (existing?.consignmentId.startsWith('failed-')) {
    await prisma.shipment.delete({ where: { orderId } });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shippingAddress: true,
      buyer: true,
    },
  });
  if (!order || order.status !== 'PACKED') return;

  const addr = order.shippingAddress;
  if (!addr) throw new AppError('VALIDATION_ERROR', 'Missing shipping address', 400);

  const codAmount = order.paymentMethod === 'COD' ? order.total.toString() : '0.00';

  try {
    const created = await courier.createShipment({
      orderId: order.id,
      invoice: order.id,
      recipientName: order.buyer.name,
      recipientPhone: addr.phone,
      recipientAddress: `${addr.line1}, ${addr.area}, ${addr.district}`,
      codAmount,
      note: 'BookVerse',
    });

    await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          provider: courier.kind,
          consignmentId: created.consignmentId,
          trackingCode: created.trackingCode,
          codAmount,
          courierStatus: created.rawStatus,
          pollAfter: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
      await tx.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          providerEventId: `create:${created.consignmentId}`,
          status: created.rawStatus,
          message: 'Shipment created',
          raw: created as unknown as object,
        },
      });
      const current = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (current.status === 'PACKED') {
        await transitionOrderStatus(tx, {
          orderId,
          from: 'PACKED',
          to: 'SHIPPED',
          note: 'Courier consignment created',
        });
      }
    });
  } catch (err) {
    await prisma.shipment.upsert({
      where: { orderId },
      create: {
        orderId,
        provider: courier.kind,
        consignmentId: `failed-${orderId}`,
        codAmount,
        courierStatus: 'failed',
        failureCount: 1,
        lastError: err instanceof Error ? err.message : 'create failed',
        pollAfter: new Date(Date.now() + 5 * 60 * 1000),
      },
      update: {
        failureCount: { increment: 1 },
        lastError: err instanceof Error ? err.message : 'create failed',
        pollAfter: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    throw err;
  }
}

export async function retryShipmentCreate(env: ApiEnv, courier: CourierProvider, orderId: string) {
  await prisma.shipment.deleteMany({
    where: { orderId, consignmentId: { startsWith: 'failed-' } },
  });
  await createShipmentForOrder(env, courier, orderId);
}
