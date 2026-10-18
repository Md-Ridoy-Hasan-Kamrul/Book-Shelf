-- Checkout, stock reservation, commission snapshots, COD settings

CREATE TYPE "CheckoutStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENT', 'FIXED');

ALTER TABLE "User" ADD COLUMN "trustScore" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "User" ADD COLUMN "rtoCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Listing" ADD COLUMN "reservedQty" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Checkout" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "couponCode" TEXT,
    "shippingAddressId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Checkout_idempotencyKey_key" ON "Checkout"("idempotencyKey");
CREATE INDEX "Checkout_buyerId_createdAt_id_idx" ON "Checkout"("buyerId", "createdAt", "id");

ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_idempotencyKey_key";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "idempotencyKey";

ALTER TABLE "Order" ADD COLUMN "checkoutId" TEXT;
ALTER TABLE "Order" ADD COLUMN "sellerId" TEXT;

CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "CouponDiscountType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "minSubtotal" DECIMAL(12,2),
    "maxDiscount" DECIMAL(12,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

CREATE TABLE "DeliveryFeeRule" (
    "id" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "baseFee" DECIMAL(12,2) NOT NULL,
    "perItemFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "perKgFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "DeliveryFeeRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeliveryFeeRule_district_key" ON "DeliveryFeeRule"("district");

CREATE TABLE "OrderStatusTransition" (
    "id" TEXT NOT NULL,
    "fromStatus" "OrderStatus" NOT NULL,
    "toStatus" "OrderStatus" NOT NULL,
    "note" TEXT,
    CONSTRAINT "OrderStatusTransition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrderStatusTransition_fromStatus_toStatus_key" ON "OrderStatusTransition"("fromStatus", "toStatus");

ALTER TABLE "OrderLineItem" ADD COLUMN "sellerId" TEXT;
ALTER TABLE "OrderLineItem" ADD COLUMN "commissionBps" INTEGER;
ALTER TABLE "OrderLineItem" ADD COLUMN "commissionAmount" DECIMAL(12,2);
ALTER TABLE "OrderLineItem" ADD COLUMN "sellerAmount" DECIMAL(12,2);

-- Existing DBs without orders: backfill not required. Fresh migrate only.

ALTER TABLE "Order" ALTER COLUMN "checkoutId" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "sellerId" SET NOT NULL;

ALTER TABLE "OrderLineItem" ALTER COLUMN "sellerId" SET NOT NULL;
ALTER TABLE "OrderLineItem" ALTER COLUMN "commissionBps" SET NOT NULL;
ALTER TABLE "OrderLineItem" ALTER COLUMN "commissionAmount" SET NOT NULL;
ALTER TABLE "OrderLineItem" ALTER COLUMN "sellerAmount" SET NOT NULL;

ALTER TABLE "Order" ADD CONSTRAINT "Order_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Order_checkoutId_idx" ON "Order"("checkoutId");
CREATE INDEX "Order_sellerId_createdAt_id_idx" ON "Order"("sellerId", "createdAt", "id");
