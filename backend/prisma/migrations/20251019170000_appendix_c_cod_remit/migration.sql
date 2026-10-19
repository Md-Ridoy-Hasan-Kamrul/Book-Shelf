-- Appendix C: track when courier remitted COD cash
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "codRemittedAt" TIMESTAMP(3);
