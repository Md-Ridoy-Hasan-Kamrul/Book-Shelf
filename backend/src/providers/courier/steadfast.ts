import type { ApiEnv } from '@bookverse/shared';
import type {
  CourierProvider,
  CreateShipmentInput,
  CreateShipmentResult,
  ParsedCourierWebhook,
  TrackShipmentResult,
} from './types.js';

/** Base URL — confirm on official Steadfast merchant docs before live use. */
const SANDBOX_BASE = 'https://portal.packzy.com/api/v1';

export function createSteadfastCourierProvider(env: ApiEnv): CourierProvider {
  const base = process.env.STEADFAST_API_BASE ?? SANDBOX_BASE;
  const bearer = process.env.STEADFAST_WEBHOOK_BEARER_TOKEN ?? '';

  return {
    kind: 'steadfast',
    async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
      if (!env.STEADFAST_API_KEY || !env.STEADFAST_SECRET_KEY) {
        throw new Error('Steadfast API credentials not configured');
      }
      const res = await fetch(`${base}/create_order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': env.STEADFAST_API_KEY,
          'Secret-Key': env.STEADFAST_SECRET_KEY,
        },
        body: JSON.stringify({
          invoice: input.invoice,
          recipient_name: input.recipientName,
          recipient_phone: input.recipientPhone,
          recipient_address: input.recipientAddress,
          cod_amount: Number(input.codAmount),
          note: input.note ?? '',
          delivery_type: 0,
        }),
      });
      const json = (await res.json()) as {
        consignment?: { consignment_id?: number; tracking_code?: string; status?: string };
      };
      const c = json.consignment;
      if (!c?.consignment_id) {
        throw new Error('Steadfast create_order failed — verify API response shape');
      }
      return {
        consignmentId: String(c.consignment_id),
        trackingCode: c.tracking_code ?? '',
        rawStatus: c.status ?? 'in_review',
      };
    },
    async trackShipment(consignmentId: string): Promise<TrackShipmentResult> {
      if (!env.STEADFAST_API_KEY || !env.STEADFAST_SECRET_KEY) {
        throw new Error('Steadfast API credentials not configured');
      }
      const url = `${base}/status_by_cid/${consignmentId}`;
      const res = await fetch(url, {
        headers: {
          'Api-Key': env.STEADFAST_API_KEY,
          'Secret-Key': env.STEADFAST_SECRET_KEY,
        },
      });
      const json = (await res.json()) as { delivery_status?: string; tracking_message?: string };
      return {
        consignmentId,
        rawStatus: json.delivery_status ?? 'unknown',
        trackingMessage: json.tracking_message,
      };
    },
    async cancelShipment(_consignmentId: string): Promise<void> {
      throw new Error('Steadfast cancel endpoint not verified — see VERIFY-BEFORE-LAUNCH');
    },
    parseWebhook(headers, body): ParsedCourierWebhook {
      const auth = headers.authorization ?? headers.Authorization;
      if (bearer && auth !== `Bearer ${bearer}`) {
        return {
          ok: false,
          eventId: 'unauthorized',
          consignmentId: String(body.consignment_id ?? ''),
          rawStatus: String(body.status ?? ''),
          raw: body,
          reason: 'Invalid Steadfast webhook bearer token',
        };
      }
      const consignmentId = String(body.consignment_id ?? '');
      const rawStatus = String(body.status ?? '');
      const updatedAt = String(body.updated_at ?? new Date().toISOString());
      return {
        ok: true,
        eventId: `${consignmentId}:${rawStatus}:${updatedAt}`,
        consignmentId,
        rawStatus,
        codAmount: body.cod_amount != null ? String(body.cod_amount) : undefined,
        trackingMessage: body.tracking_message ? String(body.tracking_message) : undefined,
        raw: body,
      };
    },
  };
}
