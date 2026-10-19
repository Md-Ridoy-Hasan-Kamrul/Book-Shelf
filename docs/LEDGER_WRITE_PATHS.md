# Ledger & points write-path review (P17)

## Money (`LedgerEntry`)

Immutable amount/kind/owner; status/availableAt via escrow only; corrections = new ADJUSTMENT.

| Path                     | Service                    | Notes                  |
| ------------------------ | -------------------------- | ---------------------- |
| Sale / commission on pay | checkout / payment capture | txn + idempotencyKey   |
| Escrow release           | `escrowService`            | status → AVAILABLE     |
| Refund / RTO             | money services             | ADJUSTMENT / RTO_COST  |
| Payout batch             | `payoutService`            | marks AVAILABLE → PAID |
| COD remit                | `codRemitService`          |                        |
| Admin reconcile          | `reconcileService`         | read/compare           |

Command: `pnpm reconcile` → orders vs ledger.

## Points (`PointLedger`)

**Only** `awardPoints()` may change `User.pointsBalance`.

| Reason                      | Caller                           |
| --------------------------- | -------------------------------- |
| PURCHASE_DELIVERED          | purchasePoints / order delivered |
| FIRST_REVIEW                | reviewService                    |
| FINISH_BOOK / GOAL_COMPLETE | bookshelfService                 |
| HELPFUL_VOTE                | reviewService                    |
| BETA_READER_REWARD          | betaReaderService                |
| REDEEM                      | redeemPoints                     |
| ADJUSTMENT                  | tests / admin tools              |

Command: `pnpm verify:points` → balance === SUM(delta) for all users.
