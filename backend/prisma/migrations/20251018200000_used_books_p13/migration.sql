-- P13: Used-book marketplace + ISBN cache + seller ratings

ALTER TYPE "ListingCondition" ADD VALUE IF NOT EXISTS 'READABLE';
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'PENDING_MODERATION';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'LISTING';

DO $$ BEGIN
  CREATE TYPE "ListingFulfillment" AS ENUM ('SHIPPING', 'PICKUP', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "isUsed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "photoKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "area" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "fulfillment" "ListingFulfillment" NOT NULL DEFAULT 'SHIPPING';
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3);
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "moderatedById" TEXT;

CREATE INDEX IF NOT EXISTS "Listing_isUsed_district_status_idx"
  ON "Listing"("isUsed", "district", "status");

CREATE TABLE IF NOT EXISTS "IsbnCache" (
  "id" TEXT NOT NULL,
  "isbn" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "titleBn" TEXT,
  "authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "description" TEXT,
  "coverUrl" TEXT,
  "pageCount" INTEGER,
  "publishedYear" INTEGER,
  "language" TEXT,
  "source" TEXT NOT NULL,
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IsbnCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IsbnCache_isbn_key" ON "IsbnCache"("isbn");

CREATE TABLE IF NOT EXISTS "SellerRating" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "listingId" TEXT,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "body" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SellerRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SellerRating_orderId_key" ON "SellerRating"("orderId");
CREATE INDEX IF NOT EXISTS "SellerRating_sellerId_createdAt_idx" ON "SellerRating"("sellerId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "SellerRating" ADD CONSTRAINT "SellerRating_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SellerRating" ADD CONSTRAINT "SellerRating_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SellerRating" ADD CONSTRAINT "SellerRating_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SellerRating" ADD CONSTRAINT "SellerRating_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
