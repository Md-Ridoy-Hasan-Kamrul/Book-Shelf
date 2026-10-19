# Appendix A ↔ live Prisma mapping (BookVerse)

Appendix A is the **conceptual core** (P3+). The live schema in `backend/prisma/schema.prisma` is **Appendix A + Better Auth merge + P4–P17 extensions**. This file is the source of truth for name/shape differences. We do **not** rewrite live models to Appendix A literals (would break Better Auth, money paths, and shipped prompts).

## Enums

| Appendix A                                     | Live                                                              | Notes                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- |
| `Role` (+ RIDER)                               | `UserRole` (+ `MODERATOR`, `RIDER`)                               | `RIDER` present; `FEATURE_RIDER=false` → no routes/UI |
| `UserStatus`                                   | `bannedAt` / `suspendedUntil` / soft-delete                       | Equivalent lifecycle without a single enum            |
| `ListingType` NEW/USED                         | `Listing.isUsed` + `ListingCondition`                             | Used module gated by `FEATURE_USED_BOOKS`             |
| `BookCondition`                                | `ListingCondition`                                                | Same values                                           |
| `PaymentMethod` COD / SSLCOMMERZ               | `COD` / `ONLINE`                                                  | Provider = `sslcommerz` \| `mock` on payment intent   |
| `PaymentStatus` INITIATED/PAID/…               | `PaymentStatus` + `PaymentIntentStatus`                           | Split intent vs business payment state                |
| `OrderStatus` (rich courier set)               | Compact set + `OrderStatusTransition` / history / shipment status | Courier detail on `Shipment.status`                   |
| `LedgerKind`                                   | `LedgerEntryKind`                                                 | Includes Appendix kinds + escrow helpers              |
| `LedgerStatus` PENDING/AVAILABLE/PAID/REVERSED | PENDING/AVAILABLE/PAID/`VOID`                                     | `VOID` ≈ REVERSED                                     |

## Models

| Appendix A             | Live equivalent                                           | Notes                                                                                          |
| ---------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `User`                 | `User` (+ Better Auth `Session`/`Account`/`Verification`) | `id` is Better Auth string id; `role` not client-writable                                      |
| `Follow`               | `Follow`                                                  | Same unique (follower, following)                                                              |
| `Book`                 | `Book` + `Genre`                                          | `genreTags[]` → `genreId` relation; `moodTags` kept; `coverKey` not `coverUrl`                 |
| `Listing`              | `Listing`                                                 | `type`→`isUsed`; `isActive`→`status=ACTIVE`; `images`→`photoKeys`                              |
| `Checkout` + `Payment` | `Checkout` + `PaymentIntent`                              | One intent per checkout; webhooks → `PaymentEvent`                                             |
| `Order`                | `Order`                                                   | Per-seller; address via `Address` FK (not JSON blob)                                           |
| `OrderItem`            | `OrderLineItem`                                           | Snapshots: unitPrice, commissionBps, amounts                                                   |
| `PaymentEvent`         | `PaymentEvent`                                            | `@@unique([provider, eventId])`                                                                |
| `Shipment`             | `Shipment` + events/mappings                              | COD remit tracked via courier actions / ledger                                                 |
| `LedgerEntry`          | `LedgerEntry`                                             | amount/kind/owner immutable; escrow flips status/`availableAt`                                 |
| `Payout`               | `Payout`                                                  | Linked ledger rows                                                                             |
| `PointLedger`          | `PointLedger`                                             | Append-only; `@@unique([userId, reason, refId])`; `balanceAfter` written by `awardPoints` only |
| `CommissionRule`       | `CommissionRule`                                          | Scoped by `sellerType` / `genreSlug` + priority                                                |
| `SystemSetting`        | `SystemSetting`                                           |                                                                                                |
| `AdminAuditLog`        | `AdminAuditLog`                                           |                                                                                                |

## Intentional omissions / extras

- **Not in Appendix A (shipped later):** social, wishlist, bookshelf, used books, mood, publisher growth, live events, etc.
- **RIDER:** enum value only until `FEATURE_RIDER` is turned on (out of scope per AGENTS).
- **Platform ledger owner:** `LedgerOwnerType` + platform user setting instead of `ownerId` null-only.

## Golden rules (unchanged)

1. Server is source of truth for price/stock/commission/payment.
2. Money + points: Decimal/paisa; PointLedger only via `awardPoints()`.
3. Zod in `packages/shared`; services own authorization.
