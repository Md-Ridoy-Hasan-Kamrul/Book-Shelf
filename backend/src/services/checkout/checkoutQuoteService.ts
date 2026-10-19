import { fromPaisa, toPaisa } from '@bookverse/shared';
import type { z } from 'zod';
import type { checkoutQuoteBodySchema } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { getSystemSetting } from '../settings/systemSettingsService.js';
import { resolveCommissionBps } from './commissionService.js';
import { formatDiscount, resolveCouponDiscount } from './couponService.js';
import { computeShippingFeePaisa, shippingFeeDisplay } from './deliveryFeeService.js';
import { mergeCartLines, type CartLine } from './cartLines.js';
import { applyOffersToLines } from '../publisher/offerService.js';

type QuoteInput = z.infer<typeof checkoutQuoteBodySchema>;

type ResolvedLine = {
  listingId: string;
  bookId: string;
  title: string;
  sellerId: string;
  sellerName: string;
  sellerType: import('@prisma/client').SellerType;
  genreSlug: string;
  unitPrice: string;
  qty: number;
  lineTotalPaisa: bigint;
  availableQty: number;
  pageCount: number;
  commissionBps: number;
};

async function resolveLines(
  items: CartLine[],
): Promise<{ lines: ResolvedLine[]; issues: string[] }> {
  const merged = mergeCartLines(items);
  const maxItems = await getSystemSetting<number>('max_cart_items', 20);
  if (merged.length > maxItems) {
    throw new AppError('VALIDATION_ERROR', `Cart cannot exceed ${maxItems} distinct listings`, 400);
  }

  const listings = await prisma.listing.findMany({
    where: { id: { in: merged.map((m) => m.listingId) }, status: 'ACTIVE' },
    include: {
      book: { include: { genre: true } },
      seller: { select: { id: true, displayName: true, name: true } },
      vendor: { select: { shopName: true } },
    },
  });

  const byId = new Map(listings.map((l) => [l.id, l]));
  const issues: string[] = [];
  const lines: ResolvedLine[] = [];

  for (const item of merged) {
    const listing = byId.get(item.listingId);
    if (!listing) {
      issues.push(`Listing ${item.listingId} is unavailable`);
      continue;
    }
    const availableQty = listing.stock - listing.reservedQty;
    if (availableQty < item.qty) {
      issues.push(`Insufficient stock for ${listing.book.title}`);
    }
    const unitPrice = listing.price.toString();
    const lineTotalPaisa = toPaisa(unitPrice) * BigInt(item.qty);
    const commissionBps = await resolveCommissionBps(listing.sellerType, listing.book.genre.slug);
    const sellerName =
      listing.vendor?.shopName ?? listing.seller.displayName ?? listing.seller.name ?? 'Seller';
    lines.push({
      listingId: listing.id,
      bookId: listing.bookId,
      title: listing.book.title,
      sellerId: listing.sellerId,
      sellerName,
      sellerType: listing.sellerType,
      genreSlug: listing.book.genre.slug,
      unitPrice,
      qty: item.qty,
      lineTotalPaisa,
      availableQty,
      pageCount: listing.book.pageCount ?? 250,
      commissionBps,
    });
  }

  return { lines, issues };
}

export async function buildCheckoutQuote(input: QuoteInput) {
  const { lines: rawLines, issues } = await resolveLines(input.items);
  if (rawLines.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'No valid items in cart', 400);
  }

  const offered = await applyOffersToLines(
    rawLines.map((l) => ({
      listingId: l.listingId,
      unitPrice: l.unitPrice,
      qty: l.qty,
      lineTotalPaisa: l.lineTotalPaisa,
    })),
  );
  const offerByListing = new Map(offered.lines.map((l) => [l.listingId, l]));
  const lines = rawLines.map((l) => {
    const o = offerByListing.get(l.listingId);
    if (!o) return l;
    return { ...l, unitPrice: o.unitPrice, lineTotalPaisa: o.lineTotalPaisa };
  });

  let district = 'Default';
  if (input.addressId) {
    const address = await prisma.address.findUnique({ where: { id: input.addressId } });
    if (!address) {
      issues.push('Shipping address not found');
    } else {
      district = address.district;
    }
  }

  const sellerMap = new Map<string, ResolvedLine[]>();
  for (const line of lines) {
    const group = sellerMap.get(line.sellerId) ?? [];
    group.push(line);
    sellerMap.set(line.sellerId, group);
  }

  let subtotalPaisa = 0n;
  let shippingTotalPaisa = 0n;
  const sellerGroups: Array<{
    sellerId: string;
    sellerName: string;
    items: Array<{
      listingId: string;
      bookId: string;
      title: string;
      unitPrice: string;
      qty: number;
      lineTotal: string;
      availableQty: number;
      inStock: boolean;
    }>;
    subtotal: string;
    shippingFee: string;
  }> = [];

  for (const [sellerId, groupLines] of sellerMap) {
    const groupSubtotal = groupLines.reduce((sum, l) => sum + l.lineTotalPaisa, 0n);
    subtotalPaisa += groupSubtotal;
    const itemCount = groupLines.reduce((s, l) => s + l.qty, 0);
    const weightKg = groupLines.reduce((s, l) => s + (l.pageCount / 500) * l.qty, 0);
    const shipPaisa = await computeShippingFeePaisa(district, itemCount, weightKg);
    shippingTotalPaisa += shipPaisa;

    sellerGroups.push({
      sellerId,
      sellerName: groupLines[0]!.sellerName,
      items: groupLines.map((l) => ({
        listingId: l.listingId,
        bookId: l.bookId,
        title: l.title,
        unitPrice: l.unitPrice,
        qty: l.qty,
        lineTotal: fromPaisa(l.lineTotalPaisa),
        availableQty: l.availableQty,
        inStock: l.availableQty >= l.qty,
      })),
      subtotal: fromPaisa(groupSubtotal),
      shippingFee: shippingFeeDisplay(shipPaisa),
    });
  }

  const coupon = await resolveCouponDiscount(input.couponCode, subtotalPaisa);
  const discountTotalPaisa = coupon.discountPaisa + offered.offerDiscountPaisa;
  const totalPaisa = subtotalPaisa + shippingTotalPaisa - coupon.discountPaisa;
  // Flash/bundle already baked into line totals; offerDiscount is informational.
  // total uses post-offer subtotal minus coupon only.

  const minOrder = await getSystemSetting<string>('min_order_bdt', '100.00');
  if (totalPaisa < toPaisa(minOrder)) {
    issues.push(`Minimum order is ${minOrder} BDT`);
  }

  return {
    quote: {
      sellerGroups,
      coupon: input.couponCode
        ? {
            code: coupon.code || input.couponCode,
            discount: formatDiscount(coupon.discountPaisa),
            applied: coupon.applied,
            message: coupon.message,
          }
        : null,
      subtotal: fromPaisa(subtotalPaisa),
      shippingTotal: fromPaisa(shippingTotalPaisa),
      discountTotal: fromPaisa(discountTotalPaisa),
      offerDiscount: fromPaisa(offered.offerDiscountPaisa),
      total: fromPaisa(totalPaisa),
      issues,
      appliedOffers: offered.appliedOffers,
    },
    lines,
    subtotalPaisa,
    shippingTotalPaisa,
    discountTotalPaisa,
    totalPaisa,
    district,
  };
}

export type CheckoutQuoteBuild = Awaited<ReturnType<typeof buildCheckoutQuote>>;
