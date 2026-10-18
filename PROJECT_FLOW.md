# PROJECT_FLOW — BookVerse

Check off after each prompt’s ACCEPTANCE passes.

## A · Setup (P1–2)

- [x] P1 — Monorepo, Docker, ESLint/Prettier/Husky, shared tsup, API health (db+redis), providers, CI
- [x] P2 — Base.astro shell, UI kit, `/design` guide, stores, apiClient

## B · Data + Auth (P3–4)

- [x] P3 — Prisma schema, migrate (pg_trgm + FTS), seed, money helpers
- [x] P4 — Better Auth, GET /me, RBAC, follow policy, auth pages

## C · Commerce (P5–9)

- [x] P5 — Catalog API, pg SearchService, book pages, local uploads, bench script
- [x] P6 — Cart quote, COD checkout, orders, BullMQ reservation release
- [x] P7 — Mock/SSLCommerz payments, IPN, ledger, escrow, claims, payouts, reconcile
- [x] P8 — Mock courier, PACKED→shipment job, webhooks, poll fallback, sim:courier, tracking UI
- [x] P9 — Seller & admin dashboards (paginated APIs, audit log, IDOR tests, mobile UI)
- [x] P10 — Reviews, wishlist alerts, notifications, separate worker process
- [x] P11 — Social feed, reactions, comments, moderation, trending cache job
- [x] P12 — Bookshelf, reading goals, awardPoints/PointLedger, badges, points UI
- [x] P13 — Used-book marketplace, ISBN lookup/scanner, near-me, seller ratings
- [x] P14 — Mood discovery (chip query + MoodLog consent) & rule-based recommendations (10m cache); optional FEATURE_MOOD_LLM classify via LlmProvider
- [ ] Delivery courier remit → full payout rails (live Steadfast/Pathao)

## D · Retention (P10–12)

## E · Differentiators (P13–16)

## F · Hardening (P17)
