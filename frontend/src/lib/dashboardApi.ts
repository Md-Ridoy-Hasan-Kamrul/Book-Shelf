import { adminKpiSchema, apiSuccessEnvelopeSchema, sellerOverviewSchema } from '@bookverse/shared';
import { z } from 'zod';
import { getWebEnv } from '../env';

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

const listEnvelope = <T extends z.ZodTypeAny>(item: T) =>
  apiSuccessEnvelopeSchema(
    z.object({
      items: z.array(item),
      nextCursor: z.string().nullable(),
    }),
  );

export async function fetchSellerOverview() {
  const res = await authedFetch('/seller/dashboard/overview');
  if (!res.ok) return null;
  const json: unknown = await res.json();
  return apiSuccessEnvelopeSchema(sellerOverviewSchema).parse(json).data;
}

export async function fetchSellerListings(cursor?: string) {
  const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const res = await authedFetch(`/seller/dashboard/listings${q}`);
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed to load listings');
  const row = z.object({
    id: z.string(),
    bookTitle: z.string(),
    price: z.string(),
    stock: z.number(),
    reservedQty: z.number(),
    status: z.string(),
    updatedAt: z.string(),
  });
  return listEnvelope(row).parse(json).data;
}

export async function fetchSellerOrders(filter: 'all' | 'to_pack' | 'shipped' = 'all') {
  const res = await authedFetch(`/seller/dashboard/orders?filter=${filter}`);
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed to load orders');
  const row = z.object({
    id: z.string(),
    status: z.string(),
    total: z.string(),
    paymentMethod: z.string(),
    buyerName: z.string(),
    trackingCode: z.string().nullable(),
    createdAt: z.string(),
  });
  return listEnvelope(row).parse(json).data;
}

export async function packSellerOrder(orderId: string) {
  const res = await authedFetch(`/seller/dashboard/orders/${orderId}/pack`, { method: 'POST' });
  if (!res.ok) throw new Error('Pack failed');
}

export async function fetchSellerEarnings() {
  const res = await authedFetch('/seller/dashboard/earnings');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed to load earnings');
  const row = z.object({
    orderId: z.string(),
    orderTotal: z.string(),
    status: z.string(),
    createdAt: z.string(),
    lines: z.array(
      z.object({
        title: z.string(),
        lineTotal: z.string(),
        commissionBps: z.number(),
        commissionAmount: z.string(),
        sellerAmount: z.string(),
      }),
    ),
  });
  return listEnvelope(row).parse(json).data;
}

export async function fetchSellerPayouts() {
  const res = await authedFetch('/seller/dashboard/payouts');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed to load payouts');
  const row = z.object({
    id: z.string(),
    amount: z.string(),
    status: z.string(),
    reference: z.string().nullable(),
    createdAt: z.string(),
    paidAt: z.string().nullable(),
  });
  return listEnvelope(row).parse(json).data;
}

export async function fetchSellerClaims() {
  const res = await authedFetch('/seller/dashboard/claims');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed to load claims');
  const row = z.object({
    orderId: z.string(),
    status: z.string(),
    reason: z.string(),
    createdAt: z.string(),
  });
  return listEnvelope(row).parse(json).data;
}

export async function fetchAdminKpis() {
  const res = await authedFetch('/admin/dashboard/kpis');
  if (!res.ok) return null;
  const json: unknown = await res.json();
  return apiSuccessEnvelopeSchema(adminKpiSchema).parse(json).data;
}

export async function fetchAdminRoleApplications() {
  const res = await authedFetch('/admin/dashboard/role-applications?status=PENDING');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed');
  const row = z.object({
    id: z.string(),
    type: z.string(),
    status: z.string(),
    userName: z.string(),
    userEmail: z.string(),
    createdAt: z.string(),
  });
  return listEnvelope(row).parse(json).data;
}

export async function fetchAdminClaims() {
  const res = await authedFetch('/admin/dashboard/claims');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed');
  const row = z.object({
    id: z.string(),
    orderId: z.string(),
    status: z.string(),
    reason: z.string(),
    images: z.array(z.string()),
    sellerName: z.string(),
    buyerName: z.string(),
  });
  return listEnvelope(row).parse(json).data;
}

export async function fetchAdminOrders() {
  const res = await authedFetch('/admin/dashboard/orders');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed');
  const row = z.object({
    id: z.string(),
    status: z.string(),
    total: z.string(),
    sellerName: z.string(),
    buyerName: z.string(),
    createdAt: z.string(),
  });
  return listEnvelope(row).parse(json).data;
}

export async function fetchAdminPayouts() {
  const res = await authedFetch('/admin/dashboard/payouts');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed');
  const row = z.object({
    id: z.string(),
    ownerName: z.string(),
    amount: z.string(),
    status: z.string(),
    createdAt: z.string(),
  });
  return listEnvelope(row).parse(json).data;
}

export async function approveAdminPayout(id: string) {
  await authedFetch(`/admin/dashboard/payouts/${id}/approve`, { method: 'POST' });
}

export async function fetchAdminMarginWarnings() {
  const res = await authedFetch('/admin/dashboard/margin-warnings');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed');
  const row = z.object({
    listingId: z.string(),
    bookTitle: z.string(),
    sellerName: z.string(),
    price: z.string(),
    commissionBps: z.number(),
    netMarginBps: z.number(),
  });
  return listEnvelope(row).parse(json).data;
}

export async function fetchAdminSettings() {
  const res = await authedFetch('/admin/dashboard/system-settings');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed');
  return apiSuccessEnvelopeSchema(
    z.array(z.object({ key: z.string(), value: z.unknown(), updatedAt: z.string() })),
  ).parse(json).data;
}
