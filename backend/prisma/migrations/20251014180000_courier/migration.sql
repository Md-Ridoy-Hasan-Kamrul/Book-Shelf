ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PACKED';

CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "consignmentId" TEXT NOT NULL,
    "trackingCode" TEXT,
    "codAmount" DECIMAL(12,2) NOT NULL,
    "courierStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastWebhookAt" TIMESTAMP(3),
    "pollAfter" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Shipment_orderId_key" ON "Shipment"("orderId");
CREATE UNIQUE INDEX "Shipment_consignmentId_key" ON "Shipment"("consignmentId");
CREATE INDEX "Shipment_pollAfter_idx" ON "Shipment"("pollAfter");
CREATE INDEX "Shipment_courierStatus_idx" ON "Shipment"("courierStatus");
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "providerEventId" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShipmentEvent_shipmentId_providerEventId_key" ON "ShipmentEvent"("shipmentId", "providerEventId");
CREATE INDEX "ShipmentEvent_shipmentId_createdAt_idx" ON "ShipmentEvent"("shipmentId", "createdAt");
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CourierWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourierWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourierWebhookEvent_provider_eventId_key" ON "CourierWebhookEvent"("provider", "eventId");

CREATE TABLE "CourierStatusMapping" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "courierStatus" TEXT NOT NULL,
    "internalAction" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "CourierStatusMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourierStatusMapping_provider_courierStatus_key" ON "CourierStatusMapping"("provider", "courierStatus");
