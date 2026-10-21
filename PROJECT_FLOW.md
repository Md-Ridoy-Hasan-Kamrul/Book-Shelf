# PROJECT_FLOW — BookVerse

Check off after each prompt’s ACCEPTANCE passes.

## A · Setup (P1–2)

- [x] P1 — Monorepo, Docker, ESLint/Prettier/Husky, shared tsup, API health (db+redis), providers, CI
- [x] P2 — Base.astro shell, UI kit, `/design` guide, stores, apiClient
- [x] Dev infra guard — `scripts/check-infra.mjs` + worker Redis preflight (no ECONNREFUSED spam); `FEATURE_*=false` env parsed correctly (`boolish`)
- [x] FE A–D pass — marketplace home (Hero + browse strip); `GET /publishers/:slug` + Follow on publisher; seller create/cover/look-inside; admin Money tab (reconcile / payout batch / COD remit)
- [x] FE mock mode — backend **held** (not deleted); mock default ON via `mockApi.ts` + `mock-books.json`; `pnpm dev` = web only; `pnpm dev:stack` when Docker ready

## B · Data + Auth (P3–4)

- [x] P3 — Prisma schema, migrate (pg_trgm + FTS), seed, money helpers
- [x] Appendix A mapping — `docs/APPENDIX_A_MAPPING.md` (live ≠ literal Appendix; RIDER/DELIVERY_FEE/COD_REMIT/`PointLedger.balanceAfter` aligned)
- [x] P4 — Better Auth, GET /me, RBAC, follow policy, auth pages
- [x] Appendix B — `canFollow` matrix (VENDOR nobody; WRITER→USER follow-back in TX; unfollow clears back; block both ways; 50/h + mass-follow trustScore risk; publisher 3 announcements/day + Sponsored label)

## C · Commerce (P5–9)

- [x] P5 — Catalog API, pg SearchService, book pages, local uploads, bench script
- [x] P6 — Cart quote, COD checkout, orders, BullMQ reservation release
- [x] P7 — Mock/SSLCommerz payments, IPN, ledger, escrow, claims, payouts, reconcile
- [x] Appendix C — SystemSetting defaults (48h claim / 7d escrow / 500 min payout / 1500 COD new-user / trust 30); COD remit `codRemittedAt` + escrow max(delivered, remitted); margin guard; `docs/APPENDIX_C_MONEY.md`; `TEST_CLOCK_ISO`
- [x] Appendix D — CommissionRule scope/validTo; GLOBAL 10% + founding/verified/writer/vendor launch offers; LISTING USED; resolve most-specific; admin fee+courier+margin warnings; `docs/APPENDIX_D_COMMISSION.md`
- [x] P8 — Mock courier, PACKED→shipment job, webhooks, poll fallback, sim:courier, tracking UI
- [x] P9 — Seller & admin dashboards (paginated APIs, audit log, IDOR tests, mobile UI)
- [x] P10 — Reviews, wishlist alerts, notifications, separate worker process
- [x] P11 — Social feed, reactions, comments, moderation, trending cache job
- [x] P12 — Bookshelf, reading goals, awardPoints/PointLedger, badges, points UI
- [x] P13 — Used-book marketplace, ISBN lookup/scanner, near-me, seller ratings
- [x] P14 — Mood discovery (chip query + MoodLog consent) & rule-based recommendations (10m cache); optional FEATURE_MOOD_LLM classify via LlmProvider
- [x] P15 — Publisher growth (FEATURE_SPONSORED): sponsored campaigns + signed tracking, reprint demand, release/notify/preorder, flash/bundle in quote, feature review/post
- [x] P16 — Writer tools / live events (FEATURE_LIVE_EVENTS): writer profiles, blog+announcements+followersOnly, beta-reader eligibility+PointLedger rewards, Socket.io AMA room (Redis adapter, external live link), quote card html-to-image
- [ ] Delivery courier remit → full payout rails (live Steadfast/Pathao)

## D · Retention (P10–12)

## E · Differentiators (P13–16)

## F · Hardening (P17)

- [x] P17 — Local hardening: security (Origin, SSRF, IDOR docs, rate-limit report, admin TOTP), k6 script, backup/restore, Redis AOF, BullMQ DLQ UI, reconcile+points, legal drafts, Dockerfiles (not run), `docs/HARDENING_REPORT.md`
- [x] Audit gaps fixed — SiteShell PDF nav (Home/Discover/Community/Cart/Profile) + search→`/search`; FEATURE_* UI/route hide; `/account` + role-apply; Follow/Block on writer profiles; projectFiles AGENTS synced to React/`frontend`
- [x] Reader post-login hub — `/home` (orders · reading · points); role redirects via `postLogin` / `mock-login` / `/post-login`; guest `/` storefront kept
- [x] Ops dashboard polish — Donezo-like shell (sidebar · search · user chip · KPI grid · widgets) on Admin/Seller, Fresh & Human tokens
- [x] Ops dashboards use `DashboardLayout` (no storefront navbar / footer / bottom nav)
- [x] Site-wide fluid type + `bv-container` gutters (320→375→425→768→1020→1440)
- [x] PDF read-online — `content/pdfs/<slug>.pdf`; `/books/:slug/read` viewer (no download UI); stream via `/api/book-pdf/:slug` + API `GET /books/:slug/pdf`
- [x] P2 shell production polish — sticky header + suggest search + active states; mobile bottom nav icons (BN labels) + cart drawer; `SiteFooter` columns (Explore / Account / Legal P17) + Fresh & Human tokens
