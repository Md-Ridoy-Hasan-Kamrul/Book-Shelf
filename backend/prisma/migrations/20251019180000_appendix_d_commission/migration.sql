-- Appendix D: CommissionRule scope/validTo + PublisherProfile.founding

ALTER TABLE "PublisherProfile" ADD COLUMN IF NOT EXISTS "founding" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "scope" TEXT;
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "scopeRef" TEXT;
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "validTo" TIMESTAMP(3);

-- Backfill scope from legacy sellerType / genreSlug if present
UPDATE "CommissionRule"
SET "scope" = CASE
  WHEN "sellerType" IS NULL AND ("genreSlug" IS NULL OR "genreSlug" = '') THEN 'GLOBAL'
  WHEN "sellerType" IS NOT NULL THEN 'ROLE'
  WHEN "genreSlug" IS NOT NULL THEN 'CATEGORY'
  ELSE 'GLOBAL'
END
WHERE "scope" IS NULL;

UPDATE "CommissionRule"
SET "scopeRef" = CASE
  WHEN "sellerType" = 'PUBLISHER' THEN 'PUBLISHER_VERIFIED'
  WHEN "sellerType" = 'WRITER' THEN 'WRITER'
  WHEN "sellerType" = 'VENDOR' THEN 'VENDOR'
  WHEN "sellerType" = 'USER' THEN 'USED'
  WHEN "genreSlug" IS NOT NULL THEN "genreSlug"
  ELSE NULL
END
WHERE "scopeRef" IS NULL;

UPDATE "CommissionRule"
SET "scope" = 'LISTING_TYPE', "scopeRef" = 'USED'
WHERE "sellerType" = 'USER';

ALTER TABLE "CommissionRule" ALTER COLUMN "scope" SET NOT NULL;

ALTER TABLE "CommissionRule" DROP COLUMN IF EXISTS "sellerType";
ALTER TABLE "CommissionRule" DROP COLUMN IF EXISTS "genreSlug";

DROP INDEX IF EXISTS "CommissionRule_active_priority_idx";
CREATE INDEX IF NOT EXISTS "CommissionRule_active_scope_priority_idx" ON "CommissionRule"("active", "scope", "priority");
CREATE INDEX IF NOT EXISTS "CommissionRule_validFrom_validTo_idx" ON "CommissionRule"("validFrom", "validTo");
