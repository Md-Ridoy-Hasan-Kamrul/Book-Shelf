import type { Prisma } from '@prisma/client';
import { AppError } from '../../lib/appError.js';

export async function reserveListingStock(
  tx: Prisma.TransactionClient,
  listingId: string,
  qty: number,
): Promise<void> {
  const updated = await tx.$executeRaw`
		UPDATE "Listing"
		SET "reservedQty" = "reservedQty" + ${qty}
		WHERE id = ${listingId}
			AND status = 'ACTIVE'
			AND ("stock" - "reservedQty") >= ${qty}
	`;
  if (Number(updated) !== 1) {
    throw new AppError('INSUFFICIENT_STOCK', 'Not enough stock for one or more items', 409);
  }
}

export async function releaseListingReservation(
  tx: Prisma.TransactionClient,
  listingId: string,
  qty: number,
): Promise<void> {
  await tx.$executeRaw`
		UPDATE "Listing"
		SET "reservedQty" = GREATEST(0, "reservedQty" - ${qty})
		WHERE id = ${listingId}
	`;
}

/** After ship: convert reservation into stock decrement. */
export async function commitListingReservation(
  tx: Prisma.TransactionClient,
  listingId: string,
  qty: number,
): Promise<void> {
  const updated = await tx.$executeRaw`
		UPDATE "Listing"
		SET "stock" = "stock" - ${qty},
		    "reservedQty" = GREATEST(0, "reservedQty" - ${qty})
		WHERE id = ${listingId}
			AND "stock" >= ${qty}
			AND "reservedQty" >= ${qty}
	`;
  if (Number(updated) !== 1) {
    throw new AppError('CONFLICT', 'Could not commit stock for listing', 409);
  }
}
