# Appendix D — Commission rules

Rates live only as `CommissionRule` rows (never constants in checkout). Snapshot onto `OrderLineItem` at checkout: `commissionBps`, `commissionAmount`, `sellerAmount`.

## Resolution

1. Rule must be `active` and valid now (`validFrom ≤ now < validTo` or `validTo` null).
2. **Most specific** matching scope wins: `SELLER` > `LISTING_TYPE` > `CATEGORY` > `ROLE` > `GLOBAL`.
3. Ties: higher `priority` wins.
4. After a launch `validTo`, those ROLE rows stop matching → **GLOBAL 10%** applies automatically.

## Seed (bps)

| scope        | scopeRef           | bps  | validTo | note                                                |
| ------------ | ------------------ | ---- | ------- | --------------------------------------------------- |
| GLOBAL       | —                  | 1000 | —       | Standard 10%                                        |
| ROLE         | PUBLISHER_FOUNDING | 400  | +6 mo   | First 10 founding publishers (4% top of 2–4% range) |
| ROLE         | PUBLISHER_VERIFIED | 600  | +6 mo   | Launch offer                                        |
| ROLE         | WRITER             | 600  | +6 mo   | Launch offer                                        |
| ROLE         | VENDOR             | 800  | +6 mo   | Launch offer                                        |
| LISTING_TYPE | USED               | 1000 | —       | Used-book sales                                     |

`PublisherProfile.founding = true` marks the first 10 seeded publishers.

> Founding rates (2–4%) are provisional pending publisher discussions. Anything below roughly gateway fee + courier does not cover costs — admin margin warnings flag that.

## Margin warnings

Admin `/admin/dashboard/margin-warnings` flags listings where resolved commission < `payment_fee` + `estimated_courier_cost_bdt` + `min_platform_margin_bps`.

## Audit

Every commission rule change writes `AdminAuditLog` (before/after) via `updateCommissionRule`.
