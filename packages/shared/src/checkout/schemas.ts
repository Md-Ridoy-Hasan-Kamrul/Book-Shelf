import { z } from 'zod';

export const cartLineSchema = z.object({
  listingId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(99),
});

export const checkoutQuoteBodySchema = z.object({
  items: z.array(cartLineSchema).min(1).max(20),
  addressId: z.string().min(1).optional(),
  couponCode: z.string().trim().min(1).max(40).optional(),
});

export const checkoutBodySchema = checkoutQuoteBodySchema.extend({
  paymentMethod: z.enum(['COD', 'ONLINE']),
  pointsToRedeem: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

export const quoteLineSchema = z.object({
  listingId: z.string(),
  bookId: z.string(),
  title: z.string(),
  unitPrice: z.string(),
  qty: z.number(),
  lineTotal: z.string(),
  availableQty: z.number(),
  inStock: z.boolean(),
});

export const quoteSellerGroupSchema = z.object({
  sellerId: z.string(),
  sellerName: z.string(),
  items: z.array(quoteLineSchema),
  subtotal: z.string(),
  shippingFee: z.string(),
});

export const checkoutQuoteSchema = z.object({
  sellerGroups: z.array(quoteSellerGroupSchema),
  coupon: z
    .object({
      code: z.string(),
      discount: z.string(),
      applied: z.boolean(),
      message: z.string().optional(),
    })
    .nullable(),
  subtotal: z.string(),
  shippingTotal: z.string(),
  discountTotal: z.string(),
  total: z.string(),
  issues: z.array(z.string()),
});

export const orderSummarySchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  sellerName: z.string(),
  status: z.string(),
  paymentMethod: z.string(),
  total: z.string(),
  createdAt: z.string(),
});

export const checkoutResultSchema = z.object({
  checkoutId: z.string(),
  orders: z.array(orderSummarySchema),
  total: z.string(),
  paymentMethod: z.enum(['COD', 'ONLINE']),
});

export const orderDetailSchema = z.object({
  id: z.string(),
  checkoutId: z.string(),
  status: z.string(),
  paymentMethod: z.string(),
  paymentStatus: z.string(),
  subtotal: z.string(),
  shippingFee: z.string(),
  discount: z.string(),
  total: z.string(),
  sellerName: z.string(),
  lineItems: z.array(
    z.object({
      title: z.string(),
      unitPrice: z.string(),
      qty: z.number(),
      lineTotal: z.string(),
      commissionBps: z.number(),
      sellerAmount: z.string(),
    }),
  ),
  statusHistory: z.array(
    z.object({
      status: z.string(),
      note: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  tracking: z
    .object({
      consignmentId: z.string(),
      trackingCode: z.string().nullable(),
      courierStatus: z.string(),
      timeline: z.array(
        z.object({
          status: z.string(),
          message: z.string().nullable(),
          at: z.string(),
        }),
      ),
    })
    .nullable(),
  createdAt: z.string(),
});

export const addressCreateSchema = z.object({
  label: z.string().min(1).max(40),
  phone: z.string().min(10).max(20),
  division: z.string().min(1).max(80),
  district: z.string().min(1).max(80),
  area: z.string().min(1).max(80),
  line1: z.string().min(1).max(200),
  isDefault: z.boolean().optional(),
});
