import type { ApiEnv } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import type { CourierProvider } from '../../providers/courier/types.js';
import { confirmCodRemit } from '../money/codRemitService.js';
import { onOrderDelivered } from '../money/escrowService.js';
import { transitionOrderStatus } from '../order/orderStateMachine.js';
import { handleCourierReturn } from './rtoService.js';

export type WebhookProcessResult =
  | { kind: 'duplicate' }
  | { kind: 'rejected'; reason: string }
  | { kind: 'processed'; action: string | null };

export async function processCourierWebhook(
  env: ApiEnv,
  courier: CourierProvider,
  headers: Record<string, string | undefined>,
  body: Record<string, unknown>,
): Promise<WebhookProcessResult> {
  const parsed = courier.parseWebhook(headers, body);
  if (!parsed.ok) {
    return { kind: 'rejected', reason: parsed.reason ?? 'Invalid webhook' };
  }

  const existingEvent = await prisma.courierWebhookEvent.findUnique({
    where: { provider_eventId: { provider: courier.kind, eventId: parsed.eventId } },
  });
  if (existingEvent) {
    return { kind: 'duplicate' };
  }

  await prisma.courierWebhookEvent.create({
    data: {
      provider: courier.kind,
      eventId: parsed.eventId,
      payload: parsed.raw as object,
    },
  });

  const shipment = await prisma.shipment.findUnique({
    where: { consignmentId: parsed.consignmentId },
    include: { order: true },
  });
  if (!shipment) {
    throw new AppError('NOT_FOUND', 'Shipment not found for consignment', 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        providerEventId: parsed.eventId,
        status: parsed.rawStatus,
        message: parsed.trackingMessage,
        raw: parsed.raw as object,
      },
    });
    await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        courierStatus: parsed.rawStatus,
        lastWebhookAt: new Date(),
        pollAfter: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
  });

  const mapping = await prisma.courierStatusMapping.findUnique({
    where: {
      provider_courierStatus: {
        provider: courier.kind,
        courierStatus: parsed.rawStatus.toUpperCase(),
      },
    },
  });

  if (!mapping) {
    return { kind: 'processed', action: null };
  }

  await applyInternalAction(env, shipment.orderId, mapping.internalAction);
  return { kind: 'processed', action: mapping.internalAction };
}

export async function applyInternalAction(
  env: ApiEnv,
  orderId: string,
  action: string,
): Promise<void> {
  if (action === 'TRACKING_ONLY') return;

  if (action === 'SHIPPED') {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (order.status === 'SHIPPED' || order.status === 'DELIVERED') return;
      if (order.status === 'PACKED') {
        await transitionOrderStatus(tx, {
          orderId,
          from: 'PACKED',
          to: 'SHIPPED',
          note: 'Courier in transit',
        });
      }
    });
    return;
  }

  if (action === 'DELIVERED') {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (order.status === 'DELIVERED') return;
      if (order.status === 'PACKED') {
        await transitionOrderStatus(tx, {
          orderId,
          from: 'PACKED',
          to: 'SHIPPED',
          note: 'Courier shipped (auto)',
        });
      }
      const refreshed = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (refreshed.status === 'SHIPPED') {
        await transitionOrderStatus(tx, {
          orderId,
          from: 'SHIPPED',
          to: 'DELIVERED',
          note: 'Courier delivered',
        });
        await onOrderDelivered(tx, orderId, env);
        const { awardPointsForDeliveredOrder } = await import('../points/purchasePoints.js');
        await awardPointsForDeliveredOrder(orderId, tx);
      }
    });
    return;
  }

  if (action === 'RETURNED') {
    await handleCourierReturn(orderId, env);
    return;
  }

  if (action === 'COD_REMIT') {
    await confirmCodRemit(orderId, env);
  }
}

export async function applyTrackingPoll(
  env: ApiEnv,
  courier: CourierProvider,
  shipmentId: string,
): Promise<void> {
  const shipment = await prisma.shipment.findUniqueOrThrow({
    where: { id: shipmentId },
  });
  const track = await courier.trackShipment(shipment.consignmentId);
  const body: Record<string, unknown> = {
    consignment_id: shipment.consignmentId,
    status: track.rawStatus,
    updated_at: new Date().toISOString(),
    tracking_message: track.trackingMessage,
    source: 'poll',
  };
  const headers: Record<string, string> = {};
  if (courier.kind === 'mock') {
    headers['x-mock-signature'] =
      process.env.MOCK_COURIER_WEBHOOK_SECRET ?? 'local-mock-courier-secret';
  }
  await processCourierWebhook(env, courier, headers, body);
}
