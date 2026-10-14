-- P7: payments, ledger extensions, payouts, disputes

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';

ALTER TYPE "LedgerEntryKind" ADD VALUE IF NOT EXISTS 'PAYMENT_FEE';
ALTER TYPE "LedgerEntryKind" ADD VALUE IF NOT EXISTS 'RTO_COST';

CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID');
CREATE TYPE "PaymentIntentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'EXPIRED');

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);

ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "orderLineItemId" TEXT;
ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "payoutId" TEXT;

CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "tranId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "provider" TEXT NOT NULL,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
    "sessionKey" TEXT,
    "gatewayUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentIntent_checkoutId_key" ON "PaymentIntent"("checkoutId");
CREATE UNIQUE INDEX "PaymentIntent_tranId_key" ON "PaymentIntent"("tranId");
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Payout_ownerId_status_idx" ON "Payout"("ownerId", "status");
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "LedgerEntry_status_availableAt_idx" ON "LedgerEntry"("status", "availableAt");
