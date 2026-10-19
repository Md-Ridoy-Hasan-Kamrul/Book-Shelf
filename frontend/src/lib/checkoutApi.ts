import {
  addressCreateSchema,
  checkoutQuoteSchema,
  checkoutResultSchema,
  orderDetailSchema,
  orderSummarySchema,
  apiSuccessEnvelopeSchema,
} from '@bookverse/shared';
import { z } from 'zod';
import { getWebEnv } from '../env';
import { useMockData } from './mockMode';
import { resolveMockApi } from './mockApi';

function apiBase() {
  return (import.meta.env.API_INTERNAL_URL ?? getWebEnv().PUBLIC_API_URL).replace(/\/$/, '');
}

async function authedFetch(path: string, init: RequestInit = {}) {
  return fetch(`${apiBase()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
}

const addressListSchema = z.array(
  z.object({
    id: z.string(),
    label: z.string(),
    phone: z.string(),
    division: z.string(),
    district: z.string(),
    area: z.string(),
    line1: z.string(),
    isDefault: z.boolean(),
  }),
);

export async function fetchAddresses() {
  if (useMockData()) return addressListSchema.parse(resolveMockApi('/addresses'));
  const res = await authedFetch('/addresses');
  if (res.status === 401) return null;
  const json: unknown = await res.json();
  return apiSuccessEnvelopeSchema(addressListSchema).parse(json).data;
}

export async function createAddress(input: z.infer<typeof addressCreateSchema>) {
  const body = addressCreateSchema.parse(input);
  if (useMockData()) {
    return addressListSchema.element.parse(resolveMockApi('/addresses', 'POST', body));
  }
  const res = await authedFetch('/addresses', { method: 'POST', body: JSON.stringify(body) });
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Could not save address');
  return apiSuccessEnvelopeSchema(addressListSchema.element).parse(json).data;
}

export async function postCheckoutQuote(body: {
  items: Array<{ listingId: string; qty: number }>;
  addressId?: string;
  couponCode?: string;
}) {
  if (useMockData()) {
    return checkoutQuoteSchema.parse(resolveMockApi('/checkout/quote', 'POST', body));
  }
  const res = await authedFetch('/checkout/quote', { method: 'POST', body: JSON.stringify(body) });
  const json: unknown = await res.json();
  if (!res.ok) {
    const err = json as { message?: string };
    throw new Error(err.message ?? 'Quote failed');
  }
  return apiSuccessEnvelopeSchema(checkoutQuoteSchema).parse(json).data;
}

export async function initiatePayment(checkoutId: string) {
  if (useMockData()) {
    return z
      .object({ tranId: z.string(), gatewayUrl: z.string() })
      .parse(resolveMockApi('/payments/initiate', 'POST', { checkoutId }));
  }
  const res = await authedFetch('/payments/initiate', {
    method: 'POST',
    body: JSON.stringify({ checkoutId }),
  });
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Payment initiation failed');
  const schema = z.object({ tranId: z.string(), gatewayUrl: z.string() });
  return apiSuccessEnvelopeSchema(schema).parse(json).data;
}

export async function postCheckout(
  body: {
    items: Array<{ listingId: string; qty: number }>;
    addressId: string;
    paymentMethod: 'COD' | 'ONLINE';
    couponCode?: string;
  },
  idempotencyKey: string,
) {
  if (useMockData()) {
    return checkoutResultSchema.parse(resolveMockApi('/checkout', 'POST', body));
  }
  const res = await authedFetch('/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  const json: unknown = await res.json();
  if (!res.ok) {
    const err = json as { code?: string; message?: string; errors?: unknown[] };
    const e = new Error(err.message ?? 'Checkout failed') as Error & {
      code?: string;
      errors?: unknown[];
    };
    e.code = err.code;
    e.errors = err.errors;
    throw e;
  }
  return apiSuccessEnvelopeSchema(checkoutResultSchema).parse(json).data;
}

export async function fetchOrders() {
  if (useMockData()) {
    return z
      .object({
        items: z.array(orderSummarySchema),
        nextCursor: z.string().nullable(),
      })
      .parse(resolveMockApi('/orders'));
  }
  const res = await authedFetch('/orders');
  if (res.status === 401) return null;
  const json: unknown = await res.json();
  const schema = z.object({
    items: z.array(orderSummarySchema),
    nextCursor: z.string().nullable(),
  });
  return apiSuccessEnvelopeSchema(schema).parse(json).data;
}

export async function fetchOrder(id: string) {
  if (useMockData()) {
    return orderDetailSchema.parse(resolveMockApi(`/orders/${id}`));
  }
  const res = await authedFetch(`/orders/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const json: unknown = await res.json();
  return apiSuccessEnvelopeSchema(orderDetailSchema).parse(json).data;
}
