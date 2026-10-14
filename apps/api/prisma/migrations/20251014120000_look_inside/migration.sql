CREATE TYPE "LookInsideStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "BookLookInside" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "pageKeys" TEXT[],
    "copyrightConfirmed" BOOLEAN NOT NULL,
    "status" "LookInsideStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookLookInside_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookLookInside_bookId_key" ON "BookLookInside"("bookId");
CREATE INDEX "BookLookInside_status_idx" ON "BookLookInside"("status");

ALTER TABLE "BookLookInside" ADD CONSTRAINT "BookLookInside_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookLookInside" ADD CONSTRAINT "BookLookInside_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookLookInside" ADD CONSTRAINT "BookLookInside_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
