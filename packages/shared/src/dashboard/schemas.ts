import { z } from 'zod';

export const dashboardListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const sellerOrdersQuerySchema = dashboardListQuerySchema.extend({
  filter: z.enum(['all', 'to_pack', 'shipped']).default('all'),
});

export const adminRoleAppsQuerySchema = dashboardListQuerySchema.extend({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']).default('PENDING'),
});

export const sellerOverviewSchema = z.object({
  ordersTotal: z.number().int(),
  ordersToPack: z.number().int(),
  salesLast30DaysBdt: z.string(),
  balancePendingBdt: z.string(),
  balanceAvailableBdt: z.string(),
  openClaims: z.number().int(),
});

export const sellerListingRowSchema = z.object({
  id: z.string(),
  bookTitle: z.string(),
  price: z.string(),
  stock: z.number().int(),
  reservedQty: z.number().int(),
  status: z.string(),
  updatedAt: z.string(),
});

export const sellerOrderRowSchema = z.object({
  id: z.string(),
  status: z.string(),
  total: z.string(),
  paymentMethod: z.string(),
  buyerName: z.string(),
  trackingCode: z.string().nullable(),
  createdAt: z.string(),
});

export const sellerEarningRowSchema = z.object({
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

export const sellerPayoutRowSchema = z.object({
  id: z.string(),
  amount: z.string(),
  status: z.string(),
  reference: z.string().nullable(),
  createdAt: z.string(),
  paidAt: z.string().nullable(),
});

export const sellerClaimRowSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  reason: z.string(),
  createdAt: z.string(),
});

export const adminKpiSchema = z.object({
  gmvBdt: z.string(),
  orderCount: z.number().int(),
  aovBdt: z.string(),
  rtoRatePct: z.string(),
  claimRatePct: z.string(),
  takeRatePct: z.string(),
});

export const marginWarningSchema = z.object({
  listingId: z.string(),
  bookTitle: z.string(),
  sellerName: z.string(),
  price: z.string(),
  commissionBps: z.number(),
  netMarginBps: z.number(),
});

export const commissionRuleUpdateSchema = z.object({
  bps: z.number().int().min(0).max(5000).optional(),
  active: z.boolean().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  name: z.string().min(1).max(120).optional(),
});

export const systemSettingUpdateSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const sellerVerifySchema = z.object({
  verified: z.boolean(),
});
