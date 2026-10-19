# Appendix C — Money flow & settings

Live implementation lives under `backend/src/services/{checkout,money,courier}/`. Business values come from `SystemSetting` (`backend/prisma/seed-data.ts`); services must not hard-code Appendix numbers.

## SystemSetting defaults (Appendix C)

| Appendix key         | Seed / alias             | Default      |
| -------------------- | ------------------------ | ------------ |
| `claim_window_hours` | same                     | **48**       |
| `escrow_days`        | same                     | **7**        |
| `min_payout_amount`  | + `payout_min_bdt`       | **500** BDT  |
| `cod_new_user_cap`   | + `cod_new_user_max_bdt` | **1500** BDT |
| `cod_min_trust`      | + `cod_trust_score_min`  | **30**       |

Aliases are resolved in `getSystemSetting` so older keys still work after re-seed.

## Prepaid flow

1. `POST /checkout` + `Idempotency-Key` → quote recomputed server-side; stock reserved; orders `PENDING_PAYMENT`; payment intent `INITIATED`.
2. Provider session → gateway URL (`paymentInitiateService`).
3. IPN → Validation API; amount/currency/tran match; `PaymentEvent` unique `(provider, eventId)` → capture → orders `PAID`→`PROCESSING` → ledger `SALE` / `COMMISSION` / `PAYMENT_FEE` (PENDING), keys `sale:{lineId}` etc.
4. Courier `DELIVERED` → `deliveredAt` + `availableAt = deliveredAt + escrow_days`.
5. Hourly BullMQ `escrow-release` → PENDING with `availableAt <= now` and no open claim → AVAILABLE.
6. Claim within window → `DISPUTED` (entries stay PENDING / skipped by release). Admin approve → negative `REFUND` rows; reject → back to DELIVERED.
7. Weekly payout batch if AVAILABLE ≥ min; approve → Payout `PAID`, entries `PAID`. Admin audited.

## COD flow

1. Checkout confirms without gateway; `Shipment.codAmount` = order total; no ledger yet.
2. `COD_REMIT` → `codRemittedAt`, ledger SALE+commission; `availableAt = max(deliveredAt, remittedAt) + escrow_days`.
3. RTO → restock, `RTO_COST` (payer = `rto_cost_payer`, default platform), buyer `trustScore` ↓ / `rtoCount` ↑.
4. Guards: phone verified; new-user cap; trust ≥ `cod_min_trust`; COD off after 3 RTOs.

## Rules checklist

| Rule                                             | Where                                            |
| ------------------------------------------------ | ------------------------------------------------ |
| Integer paisa, Decimal(12,2), half-up commission | `packages/shared/src/money/paisa.ts`             |
| sellerAmount + commissionAmount === lineTotal    | `splitCommission` + tests                        |
| Ledger idempotencyKey                            | `ledgerService`                                  |
| amount/kind/owner immutable                      | escrow only flips status/`availableAt`           |
| Daily reconcile                                  | `pnpm reconcile` / `reconcileService`            |
| Seller reads own ledger only                     | seller dashboard filters `ownerId = sellerId`    |
| Admin money writes → AdminAuditLog               | payout approve, settings, claims                 |
| Margin guard                                     | `assertCommissionCoversFeeAndMargin` at checkout |
| Test clock                                       | `TEST_CLOCK_ISO` → `appNow()` (non-production)   |

## Naming vs Appendix

| Appendix               | Live                                    |
| ---------------------- | --------------------------------------- |
| Order CONFIRMED        | `PAID` then `PROCESSING`                |
| Payment INITIATED/PAID | `PaymentIntent` + order `paymentStatus` |
| OrderItem              | `OrderLineItem`                         |
