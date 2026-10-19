# BookVerse codebase audit vs `AGENTS.md` / `CLAUDE.md`

**Audited:** 2026-10-19  
**Scope:** Monorepo at repo root (`frontend/`, `backend/`, `packages/shared/`). Application code was not modified; this file is the only deliverable.  
**Authority:** Root [`AGENTS.md`](../AGENTS.md) / [`CLAUDE.md`](../CLAUDE.md) (treated as canonical). [`frontend/projectFiles/AGENTS.md`](../frontend/projectFiles/AGENTS.md) noted where it diverges.

---

## Executive summary

| Area                                               | Verdict                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Monorepo layout (`frontend/` vs `apps/web`)        | **DEVIATION (intentional)** — documented in README                                    |
| UI library (React vs Preact)                       | **MATCH** root AGENTS; **DEVIATION** in `frontend/projectFiles/AGENTS.md`             |
| Design tokens (theme)                              | **MATCH** palette v2 in `frontend/src/styles/global.css`                              |
| Raw hex in components                              | **PARTIAL** — few violations; theme file is correct place for hex                     |
| Feature flags `FEATURE_*`                          | **PARTIAL** — env + backend gating solid; several FE routes/nav stay visible when off |
| FE pages ↔ BE mounts                               | **PARTIAL** — core commerce/social mapped; follow/seller-catalog/admin-money gaps     |
| `PROJECT_FLOW.md`                                  | **PARTIAL** — one open item (live courier payout rails)                               |
| Money flow files                                   | **MATCH** — checkout through commission/COD present                                   |
| Appendix B (follow policy)                         | **MATCH** — policy doc + `canFollow` + tests                                          |
| Appendix D (commission scope)                      | **MATCH** — schema, resolver, seed doc aligned                                        |
| API layering (route→controller→service→repository) | **PARTIAL** — route→service; no `controllers/` or `repositories/`                     |

---

## 1. Folder layout

| Expected (PDF / `frontend/projectFiles/AGENTS.md`) | Actual                                     | Category                    |
| -------------------------------------------------- | ------------------------------------------ | --------------------------- |
| `apps/web`, `apps/api`, `packages/shared`          | `frontend/`, `backend/`, `packages/shared` | **DEVIATION (intentional)** |
| Providers under `apps/api/src/providers/`          | `backend/src/providers/`                   | **DEVIATION (intentional)** |

**Evidence**

- [`README.md`](../README.md) § Repo layout explicitly lists `frontend/`, `backend/`, `packages/shared`.
- [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) workspaces: `frontend`, `backend`, `packages/*`.
- No `apps/` directory in the repo.

**Note:** Stale copy in [`frontend/projectFiles/AGENTS.md`](../frontend/projectFiles/AGENTS.md) still references `apps/web` / `apps/api` and Preact — not aligned with live repo (see §2).

---

## 2. UI library (React vs Preact)

| Source                                                                                     | Stack stated                                                                     |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Root [`AGENTS.md`](../AGENTS.md), [`CLAUDE.md`](../CLAUDE.md), [`README.md`](../README.md) | Astro + **React**                                                                |
| [`frontend/package.json`](../frontend/package.json)                                        | `@astrojs/react`, `react`, `react-dom`, `@tanstack/react-query`                  |
| Island components                                                                          | `.tsx` under `frontend/src/components/islands/` (React hooks, no Preact imports) |
| [`frontend/projectFiles/AGENTS.md`](../frontend/projectFiles/AGENTS.md)                    | Preact compat                                                                    | **DEVIATION** (stale projectFiles doc, not runtime) |

**Category:** **MATCH** (canonical AGENTS + implementation). **DEVIATION** only for archived `projectFiles` AGENTS text.

---

## 3. Design tokens

### 3.1 Tailwind / theme

**File:** [`frontend/src/styles/global.css`](../frontend/src/styles/global.css) — Tailwind v4 `@theme` block.

| AGENTS token            | AGENTS hex | Theme (`--color-*`)          | Match            |
| ----------------------- | ---------- | ---------------------------- | ---------------- |
| paper                   | `#FFFFFF`  | `#ffffff`                    | yes              |
| cream                   | `#FBF7F0`  | `#fbf7f0`                    | yes              |
| sand                    | `#F3EDE2`  | `#f3ede2`                    | yes              |
| line                    | `#EAE3D6`  | `#eae3d6`                    | yes              |
| ink-900/700/500/300     | per AGENTS | same                         | yes              |
| brand-600/700/100       | per AGENTS | same                         | yes              |
| leaf-600/700/50/100     | per AGENTS | same (+ leaf-100)            | yes              |
| cta-500/700             | per AGENTS | + cta-600, cta-50 extensions | yes (extensions) |
| sun-100/800             | per AGENTS | + sun-200                    | yes              |
| rose / urgent / premium | per AGENTS | same                         | yes              |
| Mood chips (10)         | per AGENTS | `--color-mood-*`             | yes              |

**Also:** `--radius-card: 12px`, Hind Siliguri + Inter via [`frontend/package.json`](../frontend/package.json) font packages.

**Category:** **MATCH** for Fresh & Human palette v2.

### 3.2 Raw hex in components (violations)

Rule: _only via Tailwind theme, never raw hex in components_.

| File                                                                                                          | Issue                                                           | Category                              |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------- |
| [`frontend/src/components/islands/BookshelfBoard.tsx`](../frontend/src/components/islands/BookshelfBoard.tsx) | Inline `conic-gradient` CSS fallbacks `#2563eb`, `#F3EDE2`      | **PARTIAL** violation                 |
| [`frontend/src/components/islands/DesignGuide.tsx`](../frontend/src/components/islands/DesignGuide.tsx)       | Hex strings in contrast table labels ( `/design` reference UI ) | **PARTIAL** — intentional doc display |
| [`frontend/src/styles/global.css`](../frontend/src/styles/global.css)                                         | Hex in `@theme`                                                 | **MATCH** — allowed token source      |

Grep over `frontend/src/components/**/*.{tsx,astro}` found no other hex literals besides the above and `SiteShell.tsx` `/#features` (anchor path, not a color).

---

## 4. Feature flags (`FEATURE_*`)

### 4.1 `.env.example` + shared env

**File:** [`.env.example`](../.env.example), [`packages/shared/src/env/apiEnv.ts`](../packages/shared/src/env/apiEnv.ts)

| Flag                  | Default | Purpose (from comments / code)    |
| --------------------- | ------- | --------------------------------- |
| `FEATURE_RIDER`       | `false` | Enum only; no routes/UI           |
| `FEATURE_LIVE_EVENTS` | `false` | Writer tools, Socket.io live room |
| `FEATURE_SPONSORED`   | `false` | Publisher growth / sponsored      |
| `FEATURE_MOOD_LLM`    | `false` | Optional mood classify            |
| `FEATURE_USED_BOOKS`  | `false` | Used marketplace + ISBN           |

### 4.2 Backend gating

| Flag                  | Route registration                                                                | In-route guard                                                                                                                                                                                             | Category                                              |
| --------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `FEATURE_SPONSORED`   | [`backend/src/app.ts`](../backend/src/app.ts) — `/publisher` mounted only if true | Also `requireSponsored` in [`backend/src/routes/publisher.ts`](../backend/src/routes/publisher.ts); feed/post sponsored checks                                                                             | **MATCH**                                             |
| `FEATURE_LIVE_EVENTS` | `app.ts` — `/writer` only if true                                                 | [`backend/src/routes/writer.ts`](../backend/src/routes/writer.ts), [`backend/src/realtime/liveRoom.ts`](../backend/src/realtime/liveRoom.ts)                                                               | **MATCH**                                             |
| `FEATURE_MOOD_LLM`    | `/discover` always mounted                                                        | [`backend/src/services/discover/moodClassifyService.ts`](../backend/src/services/discover/moodClassifyService.ts)                                                                                          | **PARTIAL** (route exists; action gated — acceptable) |
| `FEATURE_USED_BOOKS`  | `/used-listings` **always** mounted                                               | Router middleware 403 when off [`backend/src/routes/usedListings.ts`](../backend/src/routes/usedListings.ts); same pattern in [`backend/src/routes/isbn.ts`](../backend/src/routes/isbn.ts), used services | **PARTIAL** vs AGENTS “routes not registered”         |
| `FEATURE_RIDER`       | N/A                                                                               | Prisma enum comment only                                                                                                                                                                                   | **MATCH** (intentional placeholder)                   |

### 4.3 Frontend gating

| Flag                  | UI behavior                                                                                                                                                                       | Category                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `FEATURE_SPONSORED`   | [`frontend/src/pages/publisher/growth.astro`](../frontend/src/pages/publisher/growth.astro) always reachable; nav may link; dashboard shows error if API 403                      | **PARTIAL** — not hidden when off |
| `FEATURE_LIVE_EVENTS` | [`frontend/src/pages/events/[id].astro`](../frontend/src/pages/events/[id].astro), [`LiveEventRoom.tsx`](../frontend/src/components/islands/LiveEventRoom.tsx) error message only | **PARTIAL**                       |
| `FEATURE_USED_BOOKS`  | [`SiteShell.tsx`](../frontend/src/components/islands/SiteShell.tsx) always shows “Used”; `/used`, `/sell/used`, `/sell/scan` always present                                       | **PARTIAL**                       |
| `FEATURE_MOOD_LLM`    | No dedicated page; classify via discover API when enabled                                                                                                                         | **MATCH**                         |

**AGENTS rule 15:** _routes not registered and UI hidden when off_ — backend mostly complies for sponsored/live; used-books and several FE entry points do not hide UI.

---

## 5. Astro pages ↔ Express mounts

### 5.1 Express top-level mounts ([`backend/src/app.ts`](../backend/src/app.ts))

| Mount prefix         | Router module                                     |
| -------------------- | ------------------------------------------------- |
| `/api/auth/*`        | Better Auth                                       |
| `/webhooks/payment`  | `webhooksPayment.ts`                              |
| `/webhooks/courier`  | `webhooksCourier.ts`                              |
| `/health`            | `health.ts`                                       |
| `/me`                | `me.ts`                                           |
| `/users`             | `follow.ts`, `users.ts`                           |
| `/role-applications` | `roleApplications.ts`                             |
| `/phone`             | `phoneOtp.ts`                                     |
| `/posts`             | `posts.ts`                                        |
| `/books`             | `books.ts`                                        |
| `/search`            | `search.ts`                                       |
| `/seller`            | `seller.ts`                                       |
| `/seller/dashboard`  | `sellerDashboard.ts`                              |
| `/admin/dashboard`   | `adminDashboard.ts`                               |
| `/reviews`           | `reviews.ts`                                      |
| `/notifications`     | `notifications.ts`                                |
| `/wishlist`          | `wishlist.ts`                                     |
| `/bookshelf`         | `bookshelf.ts`                                    |
| `/isbn`              | `isbn.ts` (flag-guarded)                          |
| `/used-listings`     | `usedListings.ts` (flag-guarded)                  |
| `/discover`          | `discover.ts`                                     |
| `/publisher`         | `publisher.ts` if `FEATURE_SPONSORED`             |
| `/writer`            | `writer.ts` if `FEATURE_LIVE_EVENTS`              |
| `/checkout`          | `checkout.ts`                                     |
| `/orders`            | `orders.ts`, seller rating from `usedListings.ts` |
| `/addresses`         | `addresses.ts`                                    |
| `/payments`          | `payments.ts`                                     |
| `/admin/money`       | `adminMoney.ts`                                   |
| `/uploads`           | `uploads.ts`                                      |

Dev proxy mirrors these in [`frontend/astro.config.mjs`](../frontend/astro.config.mjs) (except `/health`, webhooks).

### 5.2 FE page → BE API mapping

| Astro page                                                                  | Primary backend APIs                                                  | Category                                   |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| [`index.astro`](../frontend/src/pages/index.astro)                          | `/discover/mood`, `/discover/recommend`, static sections              | **MATCH**                                  |
| [`mood.astro`](../frontend/src/pages/mood.astro)                            | `/discover/mood`, `/discover/mood/log`                                | **MATCH**                                  |
| [`search.astro`](../frontend/src/pages/search.astro)                        | `/search`, `/search/suggest`                                          | **MATCH**                                  |
| [`feed.astro`](../frontend/src/pages/feed.astro)                            | `/posts/feed`, post mutations                                         | **MATCH**                                  |
| [`books/[slug].astro`](../frontend/src/pages/books/[slug].astro)            | `/books/:slug`, `/reviews/books/:bookId`, `/wishlist`, checkout quote | **MATCH**                                  |
| [`category/[slug].astro`](../frontend/src/pages/category/[slug].astro)      | `/books?genre=`                                                       | **MATCH**                                  |
| [`author/[slug].astro`](../frontend/src/pages/author/[slug].astro)          | `/books?author=`                                                      | **MATCH**                                  |
| [`publisher/[slug].astro`](../frontend/src/pages/publisher/[slug].astro)    | `/books?publisher=`                                                   | **MATCH**                                  |
| [`writers/[slug].astro`](../frontend/src/pages/writers/[slug].astro)        | `/writer/profiles/:slug` (flag)                                       | **PARTIAL** if `FEATURE_LIVE_EVENTS=false` |
| [`bookshelf.astro`](../frontend/src/pages/bookshelf.astro)                  | `/bookshelf/*`                                                        | **MATCH**                                  |
| [`points.astro`](../frontend/src/pages/points.astro)                        | `/bookshelf/points`                                                   | **MATCH**                                  |
| [`checkout.astro`](../frontend/src/pages/checkout.astro)                    | `/checkout/quote`, `/checkout`, `/addresses`, `/payments/initiate`    | **MATCH**                                  |
| [`orders/index.astro`](../frontend/src/pages/orders/index.astro)            | `/orders`                                                             | **MATCH**                                  |
| [`orders/[id].astro`](../frontend/src/pages/orders/[id].astro)              | `/orders/:id`, claim/cancel                                           | **MATCH**                                  |
| [`seller/dashboard.astro`](../frontend/src/pages/seller/dashboard.astro)    | `/seller/dashboard/*`                                                 | **MATCH**                                  |
| [`admin/dashboard.astro`](../frontend/src/pages/admin/dashboard.astro)      | `/admin/dashboard/*`                                                  | **MATCH**                                  |
| [`used.astro`](../frontend/src/pages/used.astro)                            | `/used-listings/near-me`                                              | **PARTIAL** when flag off                  |
| [`sell/used.astro`](../frontend/src/pages/sell/used.astro)                  | `/used-listings`, photos                                              | **PARTIAL** when flag off                  |
| [`sell/scan.astro`](../frontend/src/pages/sell/scan.astro)                  | `/isbn/*`                                                             | **PARTIAL** when flag off                  |
| [`publisher/growth.astro`](../frontend/src/pages/publisher/growth.astro)    | `/publisher/*`                                                        | **PARTIAL** when flag off                  |
| [`events/[id].astro`](../frontend/src/pages/events/[id].astro)              | `/writer/events/:id`, Socket.io                                       | **PARTIAL** when flag off                  |
| [`login/register/forgot/reset/verify-*`](../frontend/src/pages/login.astro) | `/api/auth/*`, `/phone/*`, `/me`                                      | **MATCH**                                  |
| [`design.astro`](../frontend/src/pages/design.astro)                        | Static / local DesignGuide                                            | **MATCH**                                  |
| [`legal/*.astro`](../frontend/src/pages/legal/terms.astro)                  | Static                                                                | **MATCH**                                  |

### 5.3 Orphans and gaps

**Backend APIs with no (or minimal) frontend consumer**

| API area            | Paths                                                                                                                         | Notes                                                                                                                           | Category                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Social follow/block | `POST/DELETE /users/:id/follow`, `POST /users/:id/block`                                                                      | Policy + tests exist; **no** follow UI in `frontend/src`                                                                        | **MISSING** FE                         |
| Seller catalog ops  | `/seller/books`, `/seller/listings/*`, look-inside flows in [`backend/src/routes/seller.ts`](../backend/src/routes/seller.ts) | Dashboard reads listings; **no** FE for create book / look-inside submit                                                        | **PARTIAL**                            |
| Role apply (user)   | `POST /role-applications`                                                                                                     | Admin lists via `/admin/dashboard/role-applications`; user-facing apply flow not in FE                                          | **MISSING** FE                         |
| Admin money (ops)   | `/admin/money/payouts/run`, `/reconcile`, `/claims/:id/resolve`, `/orders/:id/cod-remit`, `/shipment-retry`                   | Proxied but **not** called from [`AdminDashboard.tsx`](../frontend/src/components/islands/AdminDashboard.tsx); CLI/scripts/docs | **PARTIAL** (ops-by-script OK locally) |
| Health / webhooks   | `/health`, `/webhooks/*`                                                                                                      | Infra / simulators (`pnpm sim:ipn`, `pnpm sim:courier`)                                                                         | **MATCH** (non-UI)                     |
| `PATCH /users/me`   | [`backend/src/routes/users.ts`](../backend/src/routes/users.ts)                                                               | No FE usage found                                                                                                               | **MISSING** FE                         |

**Frontend pages without dedicated backend “page” API (by design)**

Catalog filter pages use `/books` query params only — **MATCH**.

**Duplicate seller pack paths:** `/seller/orders/:id/pack` and `/seller/dashboard/orders/:id/pack` — FE uses dashboard only (**DEVIATION** / legacy surface, not harmful).

---

## 6. `PROJECT_FLOW.md` vs repository

**File:** [`PROJECT_FLOW.md`](../PROJECT_FLOW.md)

| Checkbox                                                                 | Repo evidence                                                                                            | Category                        |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------- |
| P1–P16 marked `[x]`                                                      | Broad file presence (auth, checkout, feed, bookshelf, used, discover, publisher, writer, hardening docs) | **MATCH**                       |
| `[ ]` Delivery courier remit → full payout rails (live Steadfast/Pathao) | Mock courier + COD remit admin path; live rails in `docs/FUTURE_PLAN.md` / VERIFY                        | **MISSING** (expected per flow) |
| Appendix A–D references                                                  | `docs/APPENDIX_A_MAPPING.md`, `APPENDIX_C_MONEY.md`, `APPENDIX_D_COMMISSION.md`, follow policy           | **MATCH**                       |

Sections **D · Retention** and **E · Differentiators** in PROJECT_FLOW are headers only (work tracked under B/C) — **PARTIAL** doc structure, not missing code.

---

## 7. Money flow files

| Concern          | Key files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Category  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Checkout / quote | [`backend/src/routes/checkout.ts`](../backend/src/routes/checkout.ts), [`backend/src/services/checkout/checkoutService.ts`](../backend/src/services/checkout/checkoutService.ts), [`checkoutQuoteService.ts`](../backend/src/services/checkout/checkoutQuoteService.ts), [`cartLines.ts`](../backend/src/services/checkout/cartLines.ts), [`couponService.ts`](../backend/src/services/checkout/couponService.ts), [`deliveryFeeService.ts`](../backend/src/services/checkout/deliveryFeeService.ts) | **MATCH** |
| COD guards       | [`backend/src/services/checkout/codGuardService.ts`](../backend/src/services/checkout/codGuardService.ts)                                                                                                                                                                                                                                                                                                                                                                                            | **MATCH** |
| Commission       | [`backend/src/services/checkout/commissionService.ts`](../backend/src/services/checkout/commissionService.ts), tests                                                                                                                                                                                                                                                                                                                                                                                 | **MATCH** |
| Payment initiate | [`backend/src/services/money/paymentInitiateService.ts`](../backend/src/services/money/paymentInitiateService.ts), [`backend/src/routes/payments.ts`](../backend/src/routes/payments.ts)                                                                                                                                                                                                                                                                                                             | **MATCH** |
| IPN / webhooks   | [`backend/src/services/money/paymentIpnService.ts`](../backend/src/services/money/paymentIpnService.ts), [`backend/src/routes/webhooksPayment.ts`](../backend/src/routes/webhooksPayment.ts), [`scripts/sim-ipn.mjs`](../scripts/sim-ipn.mjs)                                                                                                                                                                                                                                                        | **MATCH** |
| Ledger           | [`backend/src/services/money/ledgerService.ts`](../backend/src/services/money/ledgerService.ts)                                                                                                                                                                                                                                                                                                                                                                                                      | **MATCH** |
| Escrow           | [`backend/src/services/money/escrowService.ts`](../backend/src/services/money/escrowService.ts), [`escrowTiming.ts`](../backend/src/services/money/escrowTiming.ts)                                                                                                                                                                                                                                                                                                                                  | **MATCH** |
| Claims           | [`backend/src/services/money/claimService.ts`](../backend/src/services/money/claimService.ts), `POST /orders/:id/claim`                                                                                                                                                                                                                                                                                                                                                                              | **MATCH** |
| Payouts          | [`backend/src/services/money/payoutService.ts`](../backend/src/services/money/payoutService.ts), [`payoutApprovalService.ts`](../backend/src/services/money/payoutApprovalService.ts), admin + seller dashboard routes                                                                                                                                                                                                                                                                               | **MATCH** |
| COD remit        | [`backend/src/services/money/codRemitService.ts`](../backend/src/services/money/codRemitService.ts), `POST /admin/money/orders/:id/cod-remit`                                                                                                                                                                                                                                                                                                                                                        | **MATCH** |
| Reconcile        | [`backend/src/services/money/reconcileService.ts`](../backend/src/services/money/reconcileService.ts)                                                                                                                                                                                                                                                                                                                                                                                                | **MATCH** |
| Docs             | [`docs/APPENDIX_C_MONEY.md`](../docs/APPENDIX_C_MONEY.md)                                                                                                                                                                                                                                                                                                                                                                                                                                            | **MATCH** |

---

## 8. Appendix B — follow policy shape

| Expected shape                                         | Implementation                                                                                                                                                  | Category  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Single policy function `canFollow(actor, target, ctx)` | [`backend/src/policies/canFollow.ts`](../backend/src/policies/canFollow.ts)                                                                                     | **MATCH** |
| Human-readable matrix                                  | [`frontend/docs/FOLLOW_POLICY.md`](../frontend/docs/FOLLOW_POLICY.md) (Appendix B)                                                                              | **MATCH** |
| Service enforcement + TX follow-back                   | [`backend/src/services/followService.ts`](../backend/src/services/followService.ts)                                                                             | **MATCH** |
| Matrix tests                                           | [`backend/src/policies/canFollow.test.ts`](../backend/src/policies/canFollow.test.ts), [`followService.test.ts`](../backend/src/services/followService.test.ts) | **MATCH** |
| Rate limit 50/h + mass-follow trust                    | [`backend/src/routes/follow.ts`](../backend/src/routes/follow.ts)                                                                                               | **MATCH** |

**Gap:** Policy is implemented and tested, but **no FE** exposes follow/block (§5.3) — **MISSING** product surface, not a policy-shape defect.

---

## 9. Appendix D — commission scope fields

| Field / behavior                                                   | Location                                                                                                                                                          | Category                                  |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Scopes `GLOBAL \| ROLE \| SELLER \| CATEGORY \| LISTING_TYPE`      | [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma) `CommissionRule` comment + model                                                                | **MATCH**                                 |
| `scopeRef`, `bps`, `priority`, `validFrom`, `validTo`, `active`    | Same model                                                                                                                                                        | **MATCH**                                 |
| Resolution order SELLER > LISTING_TYPE > CATEGORY > ROLE > GLOBAL  | [`SCOPE_SPECIFICITY`](../backend/src/services/checkout/commissionService.ts) + [`docs/APPENDIX_D_COMMISSION.md`](../docs/APPENDIX_D_COMMISSION.md)                | **MATCH**                                 |
| ROLE refs (WRITER, VENDOR, PUBLISHER_FOUNDING, PUBLISHER_VERIFIED) | `ruleMatches()` in `commissionService.ts`                                                                                                                         | **MATCH**                                 |
| LISTING_TYPE NEW/USED                                              | `ruleMatches()`                                                                                                                                                   | **MATCH**                                 |
| Snapshot on `OrderLineItem` at checkout                            | Documented in APPENDIX_D; enforced in checkout path                                                                                                               | **MATCH** (see checkout/commission tests) |
| Admin CRUD + audit                                                 | [`backend/src/routes/adminDashboard.ts`](../backend/src/routes/adminDashboard.ts) commission-rules + `AdminAuditLog`                                              | **MATCH**                                 |
| Seed migration                                                     | [`backend/prisma/migrations/20251019180000_appendix_d_commission/migration.sql`](../backend/prisma/migrations/20251019180000_appendix_d_commission/migration.sql) | **MATCH**                                 |

---

## 10. Additional AGENTS.md spot checks

| Rule                                          | Finding                                                                                                                                                                                                                                                                                                                   | Category    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `@astrojs/node`, no Vercel/Cloudflare adapter | [`frontend/astro.config.mjs`](../frontend/astro.config.mjs)                                                                                                                                                                                                                                                               | **MATCH**   |
| Shared Zod env                                | [`packages/shared/src/env/apiEnv.ts`](../packages/shared/src/env/apiEnv.ts)                                                                                                                                                                                                                                               | **MATCH**   |
| API envelope                                  | `@bookverse/shared` envelopes used in routes                                                                                                                                                                                                                                                                              | **MATCH**   |
| Helmet, CORS, requireOrigin                   | [`backend/src/app.ts`](../backend/src/app.ts)                                                                                                                                                                                                                                                                             | **MATCH**   |
| Cursor pagination (no OFFSET)                 | No `skip:` in `backend/src` grep                                                                                                                                                                                                                                                                                          | **MATCH**   |
| Layering route→controller→service→repository  | No `backend/src/controllers/` or `repositories/`; many routes call `prisma` directly (e.g. [`notifications.ts`](../backend/src/routes/notifications.ts), [`wishlist.ts`](../backend/src/routes/wishlist.ts), [`addresses.ts`](../backend/src/routes/addresses.ts), parts of [`posts.ts`](../backend/src/routes/posts.ts)) | **PARTIAL** |
| Providers under `backend/src/providers/`      | Present with mock/local implementations                                                                                                                                                                                                                                                                                   | **MATCH**   |
| Business logic in Astro/React                 | Pages mostly fetch + islands; commerce logic in backend services                                                                                                                                                                                                                                                          | **MATCH**   |

---

## 11. Recommended follow-ups (audit only — not implemented)

1. **Doc hygiene:** Update or archive [`frontend/projectFiles/AGENTS.md`](../frontend/projectFiles/AGENTS.md) to match root AGENTS (React + `frontend/` paths).
2. **Feature flags:** Hide nav/pages for used/sponsored/live when flags false, or SSR redirect; optionally unregister `/used-listings` when `FEATURE_USED_BOOKS=false` for strict rule 15.
3. **Product gaps:** Follow/block UI; user role-application flow; optional admin UI for `/admin/money/reconcile` and COD remit.
4. **Design:** Remove hex fallbacks in `BookshelfBoard.tsx` (use theme vars only).
5. **Layering:** Gradually move Prisma access out of route files into services/repositories where touched next.

---

## 12. How to re-run this audit

```bash
# Feature flags
rg "FEATURE_" .env.example packages/shared backend frontend

# Hex in components
rg "#[0-9A-Fa-f]{3,8}" frontend/src/components

# Express mounts
rg "app.use\\(" backend/src/app.ts

# Astro pages
dir /s /b frontend\src\pages\*.astro frontend\src\pages\**\*.astro
```

---

_End of audit._
