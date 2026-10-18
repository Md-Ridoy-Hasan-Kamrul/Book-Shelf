-- P12: Bookshelf statuses, page progress, PointLedger reason/refId, UserBadge

-- BookshelfStatus: READING→CURRENTLY_READING, FINISHED→READ, DNF→PAUSED
ALTER TYPE "BookshelfStatus" RENAME VALUE 'READING' TO 'CURRENTLY_READING';
ALTER TYPE "BookshelfStatus" RENAME VALUE 'FINISHED' TO 'READ';
ALTER TYPE "BookshelfStatus" RENAME VALUE 'DNF' TO 'PAUSED';

ALTER TABLE "BookshelfItem" ADD COLUMN IF NOT EXISTS "pageProgress" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "BookshelfItem_userId_status_idx" ON "BookshelfItem"("userId", "status");

-- PointLedger: reason + refId uniqueness (idempotent awards)
ALTER TABLE "PointLedger" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "PointLedger" ADD COLUMN IF NOT EXISTS "refId" TEXT;

UPDATE "PointLedger"
SET "reason" = COALESCE("reason", split_part("idempotencyKey", ':', 1)),
    "refId" = COALESCE("refId", NULLIF(split_part("idempotencyKey", ':', 2), ''), "id")
WHERE "reason" IS NULL OR "refId" IS NULL;

ALTER TABLE "PointLedger" ALTER COLUMN "reason" SET NOT NULL;
ALTER TABLE "PointLedger" ALTER COLUMN "refId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "PointLedger_userId_reason_refId_key"
  ON "PointLedger"("userId", "reason", "refId");

-- Badges
DO $$ BEGIN
  CREATE TYPE "BadgeType" AS ENUM (
    'BOOKWORM',
    'TOP_REVIEWER',
    'GENRE_EXPLORER',
    'EARLY_READER',
    'COMMUNITY_STAR'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "UserBadge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "BadgeType" NOT NULL,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserBadge_userId_type_key" ON "UserBadge"("userId", "type");
CREATE INDEX IF NOT EXISTS "UserBadge_type_idx" ON "UserBadge"("type");

DO $$ BEGIN
  ALTER TABLE "UserBadge"
    ADD CONSTRAINT "UserBadge_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
