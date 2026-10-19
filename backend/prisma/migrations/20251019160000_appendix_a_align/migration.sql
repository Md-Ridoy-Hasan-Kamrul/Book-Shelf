-- Appendix A alignment: RIDER role, ledger kinds, PointLedger.balanceAfter

ALTER TYPE "UserRole" ADD VALUE 'RIDER';

ALTER TYPE "LedgerEntryKind" ADD VALUE 'DELIVERY_FEE';
ALTER TYPE "LedgerEntryKind" ADD VALUE 'COD_REMIT';

-- Existing rows: reconstruct balanceAfter as running SUM(delta) per user
ALTER TABLE "PointLedger" ADD COLUMN "balanceAfter" INTEGER;

UPDATE "PointLedger" pl
SET "balanceAfter" = sub.running
FROM (
  SELECT
    id,
    SUM(delta) OVER (PARTITION BY "userId" ORDER BY "createdAt" ASC, id ASC) AS running
  FROM "PointLedger"
) sub
WHERE pl.id = sub.id;

UPDATE "PointLedger" SET "balanceAfter" = 0 WHERE "balanceAfter" IS NULL;

ALTER TABLE "PointLedger" ALTER COLUMN "balanceAfter" SET NOT NULL;
