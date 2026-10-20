import { adminKpiSchema, apiSuccessEnvelopeSchema, sellerOverviewSchema } from '@bookverse/shared';
import { z } from 'zod';
import { getWebEnv } from '../env';
import { useMockData } from './mockMode';
import { mockAdminKpis, mockAdminReconcile, mockSellerListings } from './mockCatalog';

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

const listEnvelope = <T extends z.ZodType>(item: T) =>
  apiSuccessEnvelopeSchema(
    z.object({
      items: z.array(item),
      nextCursor: z.string().nullable(),
    }),
  );

const adminRoleAppSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  createdAt: z.string(),
});
const adminClaimSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  status: z.string(),
  reason: z.string(),
  images: z.array(z.string()),
  sellerName: z.string(),
  buyerName: z.string(),
});
const adminOrderSchema = z.object({
  id: z.string(),
  status: z.string(),
  total: z.string(),
  sellerName: z.string(),
  buyerName: z.string(),
  createdAt: z.string(),
});
const adminPayoutSchema = z.object({
  id: z.string(),
  ownerName: z.string(),
  amount: z.string(),
  status: z.string(),
  createdAt: z.string(),
});
const adminMarginWarningSchema = z.object({
  listingId: z.string(),
  bookTitle: z.string(),
  sellerName: z.string(),
  price: z.string(),
  commissionBps: z.number(),
  netMarginBps: z.number(),
  floorBdt: z.string().optional(),
  commissionBdt: z.string().optional(),
});
const adminSettingSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  updatedAt: z.string(),
});
const adminReconcileSchema = z.object({
  ok: z.boolean(),
  issues: z.array(
    z.object({
      orderId: z.string(),
      expectedPaisa: z.string(),
      ledgerPaisa: z.string(),
      message: z.string(),
    }),
  ),
});

export type AdminRoleApp = z.infer<typeof adminRoleAppSchema>;
export type AdminClaim = z.infer<typeof adminClaimSchema>;
export type AdminOrder = z.infer<typeof adminOrderSchema>;
export type AdminPayout = z.infer<typeof adminPayoutSchema>;
export type AdminMarginWarning = z.infer<typeof adminMarginWarningSchema>;
export type AdminSetting = z.infer<typeof adminSettingSchema>;
export type AdminReconcile = z.infer<typeof adminReconcileSchema>;
export type AdminReconcileIssue = AdminReconcile['issues'][number];

export async function fetchSellerOverview() {
  if (useMockData()) {
    return sellerOverviewSchema.parse({
      ordersTotal: 12,
      ordersToPack: 2,
      salesLast30DaysBdt: '45000.00',
      openClaims: 0,
      balancePendingBdt: '8000.00',
      balanceAvailableBdt: '12000.00',
    });
  }
  const res = await authedFetch('/seller/dashboard/overview');
  if (!res.ok) return null;
  const json: unknown = await res.json();
  return apiSuccessEnvelopeSchema(sellerOverviewSchema).parse(json).data;
}

export async function fetchSellerListings(cursor?: string) {
  if (useMockData()) return mockSellerListings();
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
  if (useMockData()) {
    return {
      items: [
        {
          id: 'mock-order-1',
          status: 'PROCESSING',
          total: '630.00',
          paymentMethod: 'COD',
          buyerName: 'Mock Buyer',
          trackingCode: null,
          createdAt: new Date().toISOString(),
        },
      ].filter(() => filter === 'all' || filter === 'to_pack'),
      nextCursor: null as string | null,
    };
  }
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
  if (useMockData()) return;
  const res = await authedFetch(`/seller/dashboard/orders/${orderId}/pack`, { method: 'POST' });
  if (!res.ok) throw new Error('Pack failed');
}

export async function fetchSellerEarnings() {
  if (useMockData()) {
    return {
      items: [
        {
          orderId: 'mock-order-1',
          orderTotal: '630.00',
          status: 'DELIVERED',
          createdAt: new Date().toISOString(),
          lines: [
            {
              title: 'পদ্মা নদীর মাঝি',
              lineTotal: '350.00',
              commissionBps: 800,
              commissionAmount: '28.00',
              sellerAmount: '322.00',
            },
          ],
        },
      ],
      nextCursor: null as string | null,
    };
  }
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
  if (useMockData()) {
    return {
      items: [
        {
          id: 'mock-payout-1',
          amount: '5000.00',
          status: 'PENDING',
          reference: null,
          createdAt: new Date().toISOString(),
          paidAt: null,
        },
      ],
      nextCursor: null as string | null,
    };
  }
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
  if (useMockData()) return { items: [], nextCursor: null as string | null };
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
  if (useMockData()) return adminKpiSchema.parse(mockAdminKpis());
  const res = await authedFetch('/admin/dashboard/kpis');
  if (!res.ok) return null;
  const json: unknown = await res.json();
  return apiSuccessEnvelopeSchema(adminKpiSchema).parse(json).data;
}

export async function fetchAdminRoleApplications(): Promise<{
  items: AdminRoleApp[];
  nextCursor: string | null;
}> {
  if (useMockData()) {
    return {
      items: [
        {
          id: 'mock-app-1',
          type: 'WRITER',
          status: 'PENDING',
          userName: 'Mock Applicant',
          userEmail: 'writer@example.com',
          createdAt: new Date().toISOString(),
        },
      ],
      nextCursor: null,
    };
  }
  const res = await authedFetch('/admin/dashboard/role-applications?status=PENDING');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed');
  return listEnvelope(adminRoleAppSchema).parse(json).data;
}

export async function fetchAdminClaims(): Promise<{
  items: AdminClaim[];
  nextCursor: string | null;
}> {
  if (useMockData()) return { items: [], nextCursor: null };
  const res = await authedFetch('/admin/dashboard/claims');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed');
  return listEnvelope(adminClaimSchema).parse(json).data;
}

export async function fetchAdminOrders(): Promise<{
  items: AdminOrder[];
  nextCursor: string | null;
}> {
  if (useMockData()) {
    return {
      items: [
        {
          id: 'mock-order-1',
          status: 'DELIVERED',
          total: '630.00',
          sellerName: 'Pathak Samabesh',
          buyerName: 'Mock Buyer',
          createdAt: new Date().toISOString(),
        },
      ],
      nextCursor: null,
    };
  }
  const res = await authedFetch('/admin/dashboard/orders');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed');
  return listEnvelope(adminOrderSchema).parse(json).data;
}

export async function fetchAdminPayouts(): Promise<{
  items: AdminPayout[];
  nextCursor: string | null;
}> {
  if (useMockData()) {
    return {
      items: [
        {
          id: 'mock-payout-1',
          ownerName: 'Pathak Samabesh',
          amount: '5000.00',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        },
      ],
      nextCursor: null,
    };
  }
  const res = await authedFetch('/admin/dashboard/payouts');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed');
  return listEnvelope(adminPayoutSchema).parse(json).data;
}

export async function approveAdminPayout(id: string) {
  if (useMockData()) return;
  await authedFetch(`/admin/dashboard/payouts/${id}/approve`, { method: 'POST' });
}

export async function fetchAdminMarginWarnings(): Promise<{
  items: AdminMarginWarning[];
  nextCursor: string | null;
}> {
  if (useMockData()) return { items: [], nextCursor: null };
  const res = await authedFetch('/admin/dashboard/margin-warnings');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed');
  return listEnvelope(adminMarginWarningSchema).parse(json).data;
}

export async function fetchAdminSettings(): Promise<AdminSetting[]> {
  if (useMockData()) {
    return [
      { key: 'escrow_days', value: 7, updatedAt: new Date().toISOString() },
      { key: 'cod_daily_limit', value: 5000, updatedAt: new Date().toISOString() },
    ];
  }
  const res = await authedFetch('/admin/dashboard/system-settings');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Failed');
  return apiSuccessEnvelopeSchema(z.array(adminSettingSchema)).parse(json).data;
}

export async function fetchAdminReconcile(): Promise<AdminReconcile> {
  if (useMockData()) return mockAdminReconcile();
  const res = await authedFetch('/admin/money/reconcile');
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Reconcile failed');
  return apiSuccessEnvelopeSchema(adminReconcileSchema).parse(json).data;
}

export async function runAdminPayoutBatch() {
  if (useMockData()) return { created: 0, mock: true };
  const res = await authedFetch('/admin/money/payouts/run', { method: 'POST' });
  const json: unknown = await res.json();
  if (!res.ok) throw new Error('Payout batch failed');
  return apiSuccessEnvelopeSchema(z.unknown()).parse(json).data;
}

export async function confirmAdminCodRemit(orderId: string) {
  if (useMockData()) return { remitted: true };
  const res = await authedFetch(`/admin/money/orders/${encodeURIComponent(orderId)}/cod-remit`, {
    method: 'POST',
  });
  const json: unknown = await res.json();
  if (!res.ok) {
    const msg =
      json && typeof json === 'object' && 'message' in json
        ? String((json as { message: unknown }).message)
        : 'COD remit failed';
    throw new Error(msg);
  }
  return apiSuccessEnvelopeSchema(z.object({ remitted: z.boolean() })).parse(json).data;
}
