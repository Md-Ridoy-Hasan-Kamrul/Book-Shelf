import { randomUUID } from 'node:crypto';
import type { ApiEnv } from '@bookverse/shared';
import type {
  CourierProvider,
  CreateShipmentInput,
  CreateShipmentResult,
  ParsedCourierWebhook,
  TrackShipmentResult,
} from './types.js';

const store = new Map<string, { status: string; message?: string }>();

export function createMockCourierProvider(env: ApiEnv): CourierProvider {
  const secret = process.env.MOCK_COURIER_WEBHOOK_SECRET ?? 'local-mock-courier-secret';

  return {
    kind: 'mock',
    async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
      const consignmentId = `MOCK-${input.orderId.slice(0, 8)}-${randomUUID().slice(0, 6)}`;
      const trackingCode = randomUUID().slice(0, 8).toUpperCase();
      store.set(consignmentId, { status: 'created' });
      return { consignmentId, trackingCode, rawStatus: 'created' };
    },
    async trackShipment(consignmentId: string): Promise<TrackShipmentResult> {
      const row = store.get(consignmentId);
      return {
        consignmentId,
        rawStatus: row?.status ?? 'unknown',
        trackingMessage: row?.message,
      };
    },
    async cancelShipment(consignmentId: string): Promise<void> {
      store.set(consignmentId, { status: 'cancelled' });
    },
    parseWebhook(headers, body): ParsedCourierWebhook {
      const sig = headers['x-mock-signature'] ?? headers['X-Mock-Signature'];
      if (sig !== secret) {
        return {
          ok: false,
          eventId: 'invalid',
          consignmentId: String(body.consignment_id ?? ''),
          rawStatus: String(body.status ?? ''),
          raw: body,
          reason: 'Invalid mock signature',
        };
      }
      const consignmentId = String(body.consignment_id ?? '');
      const rawStatus = String(body.status ?? '').toUpperCase();
      const updatedAt = String(body.updated_at ?? new Date().toISOString());
      const eventId = `${consignmentId}:${rawStatus}:${updatedAt}`;
      store.set(consignmentId, {
        status: rawStatus.toLowerCase(),
        message: body.tracking_message ? String(body.tracking_message) : undefined,
      });
      return {
        ok: true,
        eventId,
        consignmentId,
        rawStatus,
        codAmount: body.cod_amount != null ? String(body.cod_amount) : undefined,
        trackingMessage: body.tracking_message ? String(body.tracking_message) : undefined,
        raw: body,
      };
    },
  };
}
