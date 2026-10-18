-- Review extras (P10)
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "hasSpoiler" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "helpfulCount" INTEGER NOT NULL DEFAULT 0;

-- Helpful votes on reviews
ALTER TYPE "ReactionTargetType" ADD VALUE IF NOT EXISTS 'REVIEW';

-- Notification dedupe (one alert per price change per user)
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");
