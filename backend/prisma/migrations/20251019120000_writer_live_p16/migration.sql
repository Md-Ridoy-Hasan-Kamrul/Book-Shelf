-- P16 Writer tools, live events, quote card support
ALTER TYPE "PostType" ADD VALUE IF NOT EXISTS 'BLOG';

CREATE TYPE "BetaInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'EXPIRED');
CREATE TYPE "LiveEventStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED');
CREATE TYPE "LiveQuestionStatus" AS ENUM ('QUEUED', 'ANSWERED', 'DISMISSED');

ALTER TABLE "WriterProfile" ADD COLUMN IF NOT EXISTS "slug" TEXT;
UPDATE "WriterProfile" SET "slug" = lower(regexp_replace(coalesce("penName", "id"), '[^a-zA-Z0-9\u0980-\u09FF]+', '-', 'g')) WHERE "slug" IS NULL;
ALTER TABLE "WriterProfile" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "WriterProfile_slug_key" ON "WriterProfile"("slug");

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "followersOnly" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Post_followersOnly_createdAt_idx" ON "Post"("followersOnly", "createdAt");

CREATE TABLE "BetaReaderProgram" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "requiredReviews" INTEGER NOT NULL DEFAULT 1,
    "rewardPoints" INTEGER NOT NULL DEFAULT 50,
    "minEligibilityScore" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BetaReaderProgram_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BetaReaderProgram_hostId_createdAt_id_idx" ON "BetaReaderProgram"("hostId", "createdAt", "id");
CREATE INDEX "BetaReaderProgram_bookId_idx" ON "BetaReaderProgram"("bookId");
ALTER TABLE "BetaReaderProgram" ADD CONSTRAINT "BetaReaderProgram_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BetaReaderProgram" ADD CONSTRAINT "BetaReaderProgram_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BetaReaderInvite" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "BetaInviteStatus" NOT NULL DEFAULT 'PENDING',
    "reviewsDone" INTEGER NOT NULL DEFAULT 0,
    "eligibility" INTEGER NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "BetaReaderInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BetaReaderInvite_programId_userId_key" ON "BetaReaderInvite"("programId", "userId");
CREATE INDEX "BetaReaderInvite_userId_status_idx" ON "BetaReaderInvite"("userId", "status");
ALTER TABLE "BetaReaderInvite" ADD CONSTRAINT "BetaReaderInvite_programId_fkey" FOREIGN KEY ("programId") REFERENCES "BetaReaderProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BetaReaderInvite" ADD CONSTRAINT "BetaReaderInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LiveEvent" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "status" "LiveEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "externalLiveUrl" TEXT,
    "pinnedBookId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LiveEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LiveEvent_hostId_startsAt_idx" ON "LiveEvent"("hostId", "startsAt");
CREATE INDEX "LiveEvent_status_startsAt_idx" ON "LiveEvent"("status", "startsAt");
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_pinnedBookId_fkey" FOREIGN KEY ("pinnedBookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "LiveEventQuestion" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "LiveQuestionStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveEventQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LiveEventQuestion_eventId_status_createdAt_idx" ON "LiveEventQuestion"("eventId", "status", "createdAt");
ALTER TABLE "LiveEventQuestion" ADD CONSTRAINT "LiveEventQuestion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "LiveEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveEventQuestion" ADD CONSTRAINT "LiveEventQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LiveEventBan" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveEventBan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LiveEventBan_eventId_userId_key" ON "LiveEventBan"("eventId", "userId");
ALTER TABLE "LiveEventBan" ADD CONSTRAINT "LiveEventBan_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "LiveEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveEventBan" ADD CONSTRAINT "LiveEventBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
