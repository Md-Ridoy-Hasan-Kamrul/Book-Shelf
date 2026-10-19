-- P15 Publisher growth tools
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');
CREATE TYPE "CampaignEventKind" AS ENUM ('IMPRESSION', 'CLICK', 'ADD_TO_CART', 'PURCHASE');
CREATE TYPE "CampaignInvoiceStatus" AS ENUM ('NONE', 'DRAFT', 'SENT', 'PAID');
CREATE TYPE "OfferKind" AS ENUM ('FLASH', 'BUNDLE');

ALTER TABLE "Campaign"
  ADD COLUMN "costBdt" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "targetGenreIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "followersOnly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bookId" TEXT,
  ADD COLUMN "listingId" TEXT,
  ADD COLUMN "invoiceStatus" "CampaignInvoiceStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Campaign_ownerId_status_idx" ON "Campaign"("ownerId", "status");
CREATE INDEX "Campaign_status_startsAt_endsAt_idx" ON "Campaign"("status", "startsAt", "endsAt");

CREATE TABLE "CampaignEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "kind" "CampaignEventKind" NOT NULL,
    "trackingId" TEXT NOT NULL,
    "userId" TEXT,
    "listingId" TEXT,
    "bookId" TEXT,
    "orderId" TEXT,
    "amountBdt" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CampaignEvent_trackingId_kind_key" ON "CampaignEvent"("trackingId", "kind");
CREATE INDEX "CampaignEvent_campaignId_kind_createdAt_idx" ON "CampaignEvent"("campaignId", "kind", "createdAt");
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CampaignInvoice" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "amountBdt" DECIMAL(12,2) NOT NULL,
    "status" "CampaignInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignInvoice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CampaignInvoice_ownerId_createdAt_id_idx" ON "CampaignInvoice"("ownerId", "createdAt", "id");
ALTER TABLE "CampaignInvoice" ADD CONSTRAINT "CampaignInvoice_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignInvoice" ADD CONSTRAINT "CampaignInvoice_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReprintRequest" ADD COLUMN "district" TEXT;
CREATE INDEX "ReprintRequest_bookId_createdAt_idx" ON "ReprintRequest"("bookId", "createdAt");
CREATE INDEX "ReprintRequest_district_createdAt_idx" ON "ReprintRequest"("district", "createdAt");

CREATE TABLE "BookRelease" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "releaseAt" TIMESTAMP(3) NOT NULL,
    "preorderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BookRelease_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BookRelease_bookId_key" ON "BookRelease"("bookId");
ALTER TABLE "BookRelease" ADD CONSTRAINT "BookRelease_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ReleaseNotify" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReleaseNotify_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReleaseNotify_bookId_userId_key" ON "ReleaseNotify"("bookId", "userId");
ALTER TABLE "ReleaseNotify" ADD CONSTRAINT "ReleaseNotify_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReleaseNotify" ADD CONSTRAINT "ReleaseNotify_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" "OfferKind" NOT NULL,
    "listingId" TEXT,
    "bundleListingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "flashPrice" DECIMAL(12,2),
    "buyQty" INTEGER,
    "freeQty" INTEGER,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Offer_kind_active_startsAt_endsAt_idx" ON "Offer"("kind", "active", "startsAt", "endsAt");
CREATE INDEX "Offer_listingId_active_idx" ON "Offer"("listingId", "active");
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review" ADD COLUMN "featuredAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN "featuredById" TEXT;
CREATE INDEX "Review_bookId_featuredAt_idx" ON "Review"("bookId", "featuredAt");
ALTER TABLE "Review" ADD CONSTRAINT "Review_featuredById_fkey" FOREIGN KEY ("featuredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" ADD COLUMN "featuredAt" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN "featuredById" TEXT;
ALTER TABLE "Post" ADD CONSTRAINT "Post_featuredById_fkey" FOREIGN KEY ("featuredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
