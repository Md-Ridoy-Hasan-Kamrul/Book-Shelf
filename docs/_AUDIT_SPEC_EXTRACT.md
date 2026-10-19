# BookVerse — Audit spec extract (from PDFs + projectFiles AGENTS.md)

**Sources (2026-10-05 / v1.0 prompts PDF):**

- `frontend/projectFiles/BookVerse_Project_Overview.pdf` (3 pages)
- `frontend/projectFiles/BookVerse-Step-by-Step-Prompts.pdf` (22 pages)
- `frontend/projectFiles/AGENTS.md` (Prompt 0 canonical copy in PDF)

**Purpose:** Exhaustive requirement checklist for implementation audit. Not a build plan.

---

## Stack & layout (folder names)

### Product (both PDFs + AGENTS.md)

- **Name:** BookVerse (working name)
- **Market:** Bangladesh; **currency BDT**; **Bangla (primary) + English**; **mobile-first**
- **Business:** Marketplace (publishers, writers, vendors, users selling used books) + **social reading community**
- **Scale targets:** ~10,000 active users, peak ~1,000 concurrent; long-term **GMV 15 crore BDT/year**
- **Mode:** **LOCAL-FIRST, ZERO COST** — no domain, no hosting, no paid services on dev machine
- **Runtime:** `docker-compose`: PostgreSQL, Redis, Mailpit (SMTP + UI)
- **External integrations:** Every integration behind **provider interface** in `apps/api/src/providers/<name>/` (PDF/AGENTS.md path; repo root AGENTS.md may say `backend/src/providers/` — treat as same intent)
- **SSR adapter:** `@astrojs/node` only — **do NOT** add Cloudflare / Vercel / Render adapters unless asked
- **Future upgrades:** Listed in `docs/FUTURE_PLAN.md`; implement only when asked

### Monorepo (pnpm workspaces)

| PDF / projectFiles AGENTS.md | Notes                                                                   |
| ---------------------------- | ----------------------------------------------------------------------- |
| `apps/web`                   | Astro SSR + **Preact (compat mode)** + Tailwind + TS strict             |
| `apps/api`                   | Node + Express + TS strict + Zod + Prisma + PostgreSQL + Redis + BullMQ |
| `packages/shared`            | Zod schemas + types; built with tsup; consumed by both apps             |

**Companion docs (must stay accurate):** `README.md`, `PROJECT_FLOW.md`, `AGENTS.md` (or `CLAUDE.md`), `docs/FUTURE_PLAN.md`, child READMEs as needed.

### Fixed stack (do not substitute without asking)

- **Web:** TanStack Query (via preact/compat), Zustand, GSAP (**small, purposeful animation only**)
- **Auth:** Better Auth (DB sessions, **role** field); phone OTP via **SmsProvider** (console in local)
- **Storage:** StorageProvider (local disk now, R2 later)
- **Email:** EmailProvider (SMTP → Mailpit now)
- **Payments:** PaymentProvider (mock / SSLCommerz sandbox)
- **Courier:** CourierProvider (mock default; **Steadfast adapter written but off**)
- **Search:** `pg_trgm` + simple FTS behind **SearchService** (Meilisearch replaceable later)
- **Tests:** Vitest (+ Supertest for API), Playwright for critical e2e flows

### Tooling & ops (P1)

- TypeScript **strict** everywhere; shared tsconfig base; path aliases
- ESLint + Prettier + **Husky + lint-staged**
- Vitest in **every** package
- **GitHub Actions:** install, lint, typecheck, test on every PR
- Root scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `db:migrate`, `db:seed`, `db:studio`, `backup`, `reconcile`, `sim:ipn`, `sim:courier` (last four may stub “not implemented yet” early)
- **Ports (acceptance):** web **4321**, api **4000**
- **Worker:** Separate process from API (P10+), graceful shutdown, BullMQ

### Docker (P1)

- PostgreSQL **16**, Redis **7** (`appendonly yes`), Mailpit (SMTP **1025**, UI **8025**)
- Named volumes + healthchecks

### Env validation (P1)

- Zod validate env at startup in **both** apps; fail fast with clear message
- `.env.example` (shared) must include at minimum:

  `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `WEB_ORIGIN=http://localhost:4321`, `API_ORIGIN=http://localhost:4000`, `PUBLIC_API_URL`, `API_INTERNAL_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `STORAGE_PROVIDER=local`, `EMAIL_PROVIDER=smtp`, `SMS_PROVIDER=console`, `PAYMENT_PROVIDER=mock`, `COURIER_PROVIDER=mock`, `LLM_PROVIDER=off`, `SEARCH_PROVIDER=pg`, `SSLCOMMERZ_STORE_ID` / `SSLCOMMERZ_STORE_PASSWORD` (sandbox), `STEADFAST_*`, `R2_*` (empty), feature flags (see below)

### API foundations (P1)

- `GET /health` (DB + Redis)
- Request ID, **pino** logger
- Central error handler, **response envelope** helpers, `AppError` with typed codes
- Provider registry: `apps/api/src/providers/index.ts` reads `*_PROVIDER` from env

### Layering & architecture rules (AGENTS.md / Golden Rules)

- Route → controller → service → repository; **no DB in controllers**
- **No business logic** in Astro pages or Preact components
- Server is source of truth for price, stock, coupon, commission, delivery fee, permissions, payment status
- All inputs validated with Zod from `packages/shared`
- Lists: **cursor pagination** (`createdAt` + `id`); never OFFSET for feeds
- Astro islands: **no shared Preact Context** — module singletons (`queryClient.ts`, `stores/*.ts`); hydrate via `initialData`
- API envelope: `{ success, data, meta }` / `{ success: false, code, message, errors }`; no stack traces

---

## Design tokens / colors / fonts

### Palette name

**"Fresh & Human" palette v2** — tokens **only via Tailwind theme** (no raw hex in components)

### Psychology (PDF section **২. রঙ: "ফ্রেশ ও মানবিক" ভাইবে**)

- Blue = trust; orange = action; green = growth/fresh; red = urgent; yellow = joy; purple = premium; white/cream whitespace = calm
- **v2 change:** Replaced cold dashboard gray `#F8FAFC` with warm **cream `#FBF7F0`** (book-paper feel)

### Core tokens

| Token                                        | Hex                                           | Use                                                                 |
| -------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| paper                                        | `#FFFFFF`                                     | Cards/forms                                                         |
| cream                                        | `#FBF7F0`                                     | Default page background                                             |
| sand                                         | `#F3EDE2`                                     | Alt sections                                                        |
| line                                         | `#EAE3D6`                                     | Borders                                                             |
| ink-900                                      | `#1F2A37`                                     | Primary text                                                        |
| ink-700                                      | `#374151`                                     | —                                                                   |
| ink-500                                      | `#5B6472`                                     | Secondary text                                                      |
| ink-300                                      | `#9AA3B0`                                     | Decor only                                                          |
| brand-600 / brand-700 / brand-100 / brand-50 | `#2563EB` / `#1D4ED8` / `#DBEAFE` / `#EFF6FF` | Trust, links, hovers                                                |
| leaf-600 / leaf-700 / leaf-100 / leaf-50     | `#16A34A` / `#15803D` / `#DCFCE7` / `#F0FDF4` | Stock, progress, success                                            |
| cta-500 / cta-600 / cta-700 / cta-50         | `#F97316` / `#EA580C` / `#C2410C` / `#FFF7ED` | Primary action (**ink-900 text on cta-500**; white only on cta-700) |
| sun-100 / sun-200 / sun-800                  | `#FEF3C7` / `#FDE68A` / `#92400E`             | Offers, free shipping                                               |
| rose-600                                     | `#E11D48`                                     | **Like/heart only**                                                 |
| urgent-600 / urgent-50                       | `#DC2626` / `#FEF2F2`                         | Flash sale, OOS, errors **only**                                    |
| premium-600 / premium-50                     | `#7C3AED` / `#F5F3FF`                         | Verified, VIP                                                       |

### Mood chips (10 moods — **mood picker**)

| Mood        | bg        | text      |
| ----------- | --------- | --------- |
| Happy       | `#FEF3C7` | `#92400E` |
| Calm        | `#DCFCE7` | `#166534` |
| Sad         | `#DBEAFE` | `#1E3A8A` |
| Motivated   | `#FFEDD5` | `#9A3412` |
| Curious     | `#CCFBF1` | `#115E59` |
| Romantic    | `#FFE4E6` | `#9F1239` |
| Lonely      | `#EDE9FE` | `#5B21B6` |
| Stressed    | `#E0F2FE` | `#075985` |
| Adventurous | `#ECFCCB` | `#3F6212` |
| Focused     | `#E2E8F0` | `#1E293B` |

### Layout rules

- Proportion ~**70%** cream/white, ~**15%** blue, ~**8%** leaf green, ~**5%** orange CTA
- **Max 2 orange CTAs per screen**
- **Radius 12px**; soft warm shadow `rgba(31,42,55,0.08)`

### Fonts

- **Hind Siliguri** (Bangla) + **Inter** (English)
- Self-hosted via `@fontsource`, subset, preload, `font-display: swap`

### Accessibility (P2 acceptance)

- **WCAG 2.2 AA** (PDF table lists AA ≥ 4.5 for all listed pairs)
- Mobile baseline **360px**
- Keyboard accessible; **`prefers-reduced-motion`** respected (GSAP via `matchMedia`)
- Skeleton loading, empty state, error state with retry everywhere

### Design validation (P2)

- Dev page **`/design`**: all components/states, token swatches, 10 mood chips
- After P2: show `/design` to 5–10 real readers; adjust **token file only** if needed (not ad-hoc component hex)
- Mobile Lighthouse **90+**; modal/drawer/tabs keyboard OK; no font layout shift

---

## P1–P17 prompt checklist (each prompt: goal + key deliverables)

**Usage (PDF §১. কীভাবে ব্যবহার করবেন):** Paste Prompt 0 once → run **P1…P17 one at a time** → paste Appendix blocks where marked → read AI report → verify **ACCEPTANCE** → git commit → manually review money/auth/follow/webhook diffs.

| Phase               | Prompts | Bangla map label                                          |
| ------------------- | ------- | --------------------------------------------------------- |
| A · Setup           | P1–2    | প্রজেক্ট দাঁড়ায়, ডিজাইন ও রঙ                            |
| B · Data + Auth     | P3–4    | ডাটাবেস, লগইন, follow নিয়ম                               |
| C · Commerce        | P5–9    | বই দেখা → কেনা → টাকা → ডেলিভারি → payout (**MVP দোকান**) |
| D · Retention       | P10–12  | review, alert, feed, shelf, points                        |
| E · Differentiators | P13–16  | used-book, mood, publisher tools, events                  |
| F · Hardening       | P17     | নিরাপত্তা, ব্যাকআপ, লোড টেস্ট                             |

---

### P0 — AGENTS.md (Prompt 0)

- **Goal:** One-time copy of full AGENTS.md (or `CLAUDE.md`) as project constitution
- **Deliverables:** Project description, local-first mode, fixed stack, 16 golden rules, workflow, design tokens v2, out-of-scope list (same content as PDF pages 6–7 / `projectFiles/AGENTS.md`)

---

### P1 — Monorepo, tooling, Docker (A · Setup)

- **Goal:** Initialize monorepo; local-first zero cost; read AGENTS.md first
- **Deliverables:**
  - [ ] pnpm workspace: `apps/web` (Astro server, `@astrojs/node` standalone, `@astrojs/preact` compat, Tailwind), `apps/api` (Express, tsx dev, tsup build), `packages/shared` (tsup)
  - [ ] TS strict, shared tsconfig, path aliases, Vitest all packages
  - [ ] ESLint, Prettier, Husky, lint-staged
  - [ ] `docker-compose.yml` (postgres 16, redis 7, mailpit)
  - [ ] `.env.example` + Zod env validation both apps
  - [ ] Root scripts (incl. backup, reconcile, sim:ipn, sim:courier)
  - [ ] API: `/health`, request id, pino, errors, envelope, AppError, provider registry
  - [ ] GitHub Actions CI
  - [ ] README, PROJECT_FLOW, FUTURE_PLAN accurate
- **ACCEPTANCE:** `docker compose up -d && pnpm dev` → web 4321 + api 4000; `/health` ok; shared imports both apps; lint/typecheck/test pass

---

### P2 — Design system & Astro shell (A · Setup)

- **Goal:** “Fresh” UI foundation + app shell
- **Deliverables:**
  - [ ] Tailwind theme + CSS variables for all tokens (incl. extra brand/cta/urgent/premium shades in P2 text)
  - [ ] `layouts/Base.astro`: SEO (title, description, canonical, OG), header (search, nav, cart-count island), **mobile bottom nav: Home, Discover, Community, Cart, Profile**, footer
  - [ ] `src/lib/queryClient.ts`, `src/lib/apiClient.ts` (credentials, typed envelope, ApiError)
  - [ ] `src/islands/Island.tsx` wrapper; stores: `cart.ts` (persist), `ui.ts`
  - [ ] Preact primitives (no external UI lib): Button, Input, Textarea, Select, Modal (`<dialog>`), Drawer, Tabs, Badge, Avatar, Card, Skeleton, Toast, EmptyState, ErrorState, Price (BDT, optional Bangla digits), Rating, BookCard, MoodChip, SpoilerBlur
  - [ ] GSAP helper: reduced-motion, reveal-on-scroll, count-up, hover lift; cleanup
  - [ ] Pages: `/` (placeholder sections), `/design` (style guide)
  - [ ] Contrast table report for all text/background pairs used
- **ACCEPTANCE:** Mobile Lighthouse 90+; WCAG AA; keyboard modals; no CLS; `/design` feels “fresh” to humans

---

### P3 — Database: schema, migration, seed (B · Data + Auth)

- **Goal:** Full Prisma schema + search indexes + seed
- **Deliverables:**
  - [ ] Start from **Appendix A**; extend with relations, `onDelete`, Better Auth tables merged with `User`
  - [ ] Additional models: OrderStatusHistory, Claim (orderId unique), Block, Review (`isVerifiedBuyer` server-only), BookshelfItem, ReadingGoal, Wishlist (`priceAtAdd`), Notification, NotificationPreference, Post, Comment, Reaction, Report, ReprintRequest, BookClub, ClubMember, Campaign, WriterProfile, PublisherProfile, VendorProfile, RoleApplication; `prisma validate` passes
  - [ ] Migration: `pg_trgm`, `unaccent`; GIN trigram on `Book.title` / `titleBn` / `author`; generated tsvector + GIN for descriptions
  - [ ] `DATABASE_URL` + `DIRECT_URL` → local Postgres; datasource syntax per installed Prisma docs
  - [ ] Seed: 12 genres, 200 books (BN+EN, moodTags), 5 publishers, 10 writers, 3 vendors, 50 users, sample posts/reviews, CommissionRule + SystemSetting from Appendices C & D
  - [ ] `packages/shared` money helpers: `toPaisa`, `fromPaisa`, `splitCommission` + **1000 random unit tests** (seller + commission === lineTotal)
- **ACCEPTANCE:** validate/migrate/seed pass; search EXPLAIN uses indexes; money tests pass

---

### P4 — Auth, RBAC, Follow policy (B · Data + Auth)

- **Goal:** Sessions, roles, follow matrix, auth UI
- **Deliverables:**
  - [ ] Better Auth: HttpOnly cookies, SameSite=Lax, Secure off localhost; email+password; verify + reset via Mailpit; phone OTP via SmsProvider (console prints OTP)
  - [ ] `GET /me`; Astro middleware for private routes → redirect `/login`
  - [ ] `requireAuth`, `requireRole`, `requireOwnership`
  - [ ] `POST /role-applications` (WRITER|PUBLISHER|VENDOR + docs); admin approve/reject; **users cannot set own role**
  - [ ] Follow: `canFollow` per **Appendix B**; `POST/DELETE /users/:id/follow`; transactional insert; unfollow removes writer follow-back; block removes both directions; Redis **50 follows/hour**
  - [ ] Rate limits: login 5/min/IP, OTP 3/10min/phone, signup, follow, post creation
  - [ ] Tests: full actor×target matrix; parallel follow race; privilege escalation / IDOR
  - [ ] Web islands: login, register, verify email/phone, forgot/reset password (loading/error/success)
- **ACCEPTANCE:** Policy tests green; PUBLISHER→USER follow 403; USER cannot hit admin endpoints; session works web↔api; Mailpit verification email

---

### P5 — Catalog, search, book page (C · Commerce)

- **Goal:** Browse/search/book detail; local storage for images
- **Deliverables:**
  - [ ] `GET /books` (genre, price, condition, language, NEW|USED, sort, cursor)
  - [ ] `GET /books/:slug`
  - [ ] `GET /search?q=`, `GET /search/suggest?q=` (books, authors, publishers); ranking exact/prefix > trgm > FTS; BN/EN + digit normalization; SearchService abstraction; Redis cache popular 60s
  - [ ] Publisher/vendor listing CRUD; image upload StorageProvider local `./uploads`; MIME/size checks; stock
  - [ ] **Look Inside:** 5–10 preview pages; copyright checkbox; **admin approval** before public
  - [ ] Astro SSR pages: book detail (JSON-LD Book/Product + BreadcrumbList, OG), author, publisher, category, search + filter island, 250ms debounced autocomplete; wishlist + add-to-cart islands
  - [ ] Benchmark script on 100k seeded books (p50/p95)
- **ACCEPTANCE:** search p95 < 100ms @ 100k (or report actual); BN query + typos OK; book page Lighthouse SEO 95+

---

### P6 — Cart, checkout, order lifecycle (C · Commerce)

- **Goal:** Authoritative quote/checkout; COD-first testing; Appendices C & D rules
- **Deliverables:**
  - [ ] Zustand cart is convenience only; `POST /checkout/quote` recomputes price/stock/grouping/delivery/coupon/totals
  - [ ] `POST /checkout` + **Idempotency-Key**: one Checkout, **one Order per seller**, atomic stock reserve, commission snapshot on OrderItem, OrderStatusHistory
  - [ ] Unpaid prepaid: release stock after **15 min** (BullMQ delayed job)
  - [ ] COD guards: phone verified, new-user cap, trustScore, disable after 3 RTOs → typed error → offer prepaid
  - [ ] Order state machine + allowed transitions table; status changes **only** via transitions + history; cancel before PACKED releases stock
  - [ ] Web: cart drawer, checkout steps, order list, order detail (loading/error/retry)
  - [ ] Tests: last-item race; price tampering ignored; idempotent checkout; invalid transitions rejected
- **ACCEPTANCE:** Tests green; manual: cart → quote → COD order → admin sees order

---

### P7 — Payment, ledger, escrow, claim (C · Commerce)

- **Goal:** Money flow per **Appendix C**; mock + SSLCommerz sandbox; local IPN sim
- **Deliverables:**
  - [ ] PaymentProvider: Mock (default), SslCommerzProvider (read **current** docs; verify val_id, amount, currency)
  - [ ] IPN: raw body, fast response, DB txn, PaymentEvent idempotency; ledger SALE (PENDING), COMMISSION, PAYMENT_FEE per OrderItem
  - [ ] `pnpm sim:ipn <tranId>`; doc for real sandbox + tunnel
  - [ ] COD: ledger on **courier remit** (P8); RTO → RTO_COST + trustScore
  - [ ] Escrow: on DELIVERED set `availableAt`; hourly job PENDING→AVAILABLE; **TEST CLOCK** env; only status/availableAt mutable on LedgerEntry
  - [ ] Claims: within `claim_window_hours`, images → DISPUTED, freeze; admin refund (REFUND entries) or reject
  - [ ] Payouts: weekly admin batch, min amount, PENDING→PAID + reference; entries PAID
  - [ ] `pnpm reconcile` + daily BullMQ job
  - [ ] Mandatory tests: duplicate IPN, wrong amount, refund math, claim freeze, full lifecycle balance, concurrent IPN/cancel; list VERIFY-BEFORE-LAUNCH items
- **ACCEPTANCE:** sim: payment → delivered → test clock escrow → payout; reconcile clean

---

### P8 — Courier (mock + Steadfast) (C · Commerce)

- **Goal:** Shipment lifecycle + webhooks; mock default
- **Deliverables:**
  - [ ] CourierProvider: create/track/cancel/parseWebhook; Mock default; Steadfast implementation **off**; Pathao/RedX **stubs only**
  - [ ] On seller marks **PACKED** → BullMQ creates shipment (COD amount or 0 prepaid); consignmentId/tracking; retry + admin manual retry
  - [ ] Webhook: verify, idempotent, raw payload, status mapping table; DELIVERED → escrow start; RETURNED → RTO; COD remit → P7 ledger
  - [ ] `pnpm sim:courier <consignmentId> <status>` (valid/invalid sig/duplicate/out-of-order)
  - [ ] Polling fallback every 30 min
  - [ ] Buyer tracking timeline on order page
- **ACCEPTANCE:** Simulator matrix behaves; every provider assumption in VERIFY-BEFORE-LAUNCH

---

### P9 — Seller & Admin dashboards (C · Commerce)

- **Goal:** **MVP store complete** — role dashboards
- **Deliverables:**
  - [ ] **Seller** (publisher, vendor, writer): overview (sales, pending/available balance), listings/stock, orders to pack, shipments, earnings + commission breakdown, payout history, claims
  - [ ] **Admin:** user + role-application approval, seller verification, orders, claims queue, payout approval, commission rules + system settings editor (**AdminAuditLog** before/after), margin-guard warnings, KPIs (GMV, orders, AOV, RTO rate, claim rate, take rate)
  - [ ] Paginated APIs; **IDOR tests** every dashboard endpoint; skeleton/empty/error; mobile-friendly; `client:only` islands + role guards
- **ACCEPTANCE:** IDOR tests pass; KPIs match seed ledger/orders; admin changes in audit log

---

### P10 — Review, wishlist, notification, worker (D · Retention)

- **Goal:** Trust + retention plumbing
- **Deliverables:**
  - [ ] Reviews: one/user/book; `isVerifiedBuyer` only if DELIVERED order contains book; verified separate from social; helpful votes; report; `hasSpoiler` + blur; photos (audio later)
  - [ ] Wishlist + `priceAtAdd`; price-drop & back-in-stock alerts via listing update → BullMQ (no full-table poll)
  - [ ] Notifications: domain events → BullMQ → NotificationPreference → in-app + email (Mailpit); non-spammy defaults; bell island + unread count
  - [ ] Worker process separate from API; graceful shutdown; retry/backoff; dead-letter visible to admin
  - [ ] Tests: verified flag not forgeable; one alert per price change
- **ACCEPTANCE:** One price change → exactly 1 in-app + 1 Mailpit email

---

### P11 — Social feed & moderation (D · Retention)

- **Goal:** Community layer
- **Deliverables:**
  - [ ] Post types: TEXT, IMAGE, REVIEW_SHARE, READING_UPDATE, QUOTE, QUESTION, ANNOUNCEMENT, SPONSORED
  - [ ] Comments (one reply level), LIKE|DISLIKE reactions (exclusive), save, report, edit/soft-delete, spoiler flags; counters in same txn
  - [ ] Feeds (cursor): following, trending (Redis 60s job), mixed; sponsored max **1 per 6** + label + frequency cap (`FEATURE_SPONSORED`); publisher promo max **3/day**
  - [ ] Moderation: report queue, hide/remove/restore, warn/suspend, ModerationLog, rate limits, spam score (flag only, no auto-ban)
  - [ ] Web: infinite scroll feed, optimistic like rollback, composer (image, spoiler, book mention)
  - [ ] Tests: stable feed order; blocked hidden; concurrent like counters
- **ACCEPTANCE:** feed p95 < 200ms @ 10k posts; no N+1 (report query count)

---

### P12 — Bookshelf, goals, points, badges (D · Retention)

- **Goal:** Reading identity + PointLedger discipline
- **Deliverables:**
  - [ ] Bookshelf: WANT_TO_READ, CURRENTLY_READING, READ, PAUSED; page progress; READ → updates yearly ReadingGoal; optional share as post
  - [ ] `awardPoints()` only path to `pointsBalance`; PointLedger unique `(userId, reason, refId)`
  - [ ] Rules in SystemSetting: purchase on DELIVERED, first review (min length), finish book, goal completion, helpful votes (daily cap); **no** points for like/comment spam; redeem 100 pts = 10 BDT, max 10% order (ledger + margin guard)
  - [ ] Badges: Bookworm, Top Reviewer, Genre Explorer, Early Reader, Community Star (nightly job); UserBadge unique per type
  - [ ] Web: shelf board, progress ring, goal card, points history
  - [ ] Tests: concurrent awards; balance === SUM(delta)
- **ACCEPTANCE:** Script proves all seed users `pointsBalance === SUM(delta)`

---

### P13 — Used-book marketplace & ISBN scanner (E · Differentiators)

- **Goal:** P2P used books (`FEATURE_USED_BOOKS=true`)
- **Deliverables:**
  - [ ] Verified users create USED listings: condition LIKE_NEW|GOOD|FAIR|READABLE, ≥2 photos, price, description, district/area, ship or pickup; moderation queue for first listings from new sellers
  - [ ] ISBN scanner page island (`html5-qrcode` lazy): `GET /isbn/:isbn` → Open Library → Google Books fallback; cache in DB; seller must confirm; manual entry
  - [ ] Same checkout/escrow/claim/commission as new (10% / Appendix D); stock always 1; courier flow
  - [ ] “Near me”: district/area filter first; PostGIS only if demand
  - [ ] Trust: seller rating after delivery; report listing (no duplicate-photo detection)
- **ACCEPTANCE:** Scan → listing < 30s; used order full money lifecycle

---

### P14 — Mood discovery & recommendation (E · Differentiators)

- **Goal:** Discovery without LLM by default (`LLM_PROVIDER=off`)
- **Deliverables:**
  - [ ] Mood picker: 10 MoodChip colours; Phase 1 = DB query on `Book.moodTags` + filters; copy “may match your mood” (no diagnosis); MoodLog with consent
  - [ ] Rule-based RecommendationService (weights in SystemSetting): affinity from shelf/wishlist/purchases/follows, popularity, freshness, diversity; sections: “Recommended for you”, “Because you read X”, “Trending in your genres”, “Readers who follow X also follow Y”; cache/user 10 min
  - [ ] Optional `FEATURE_MOOD_LLM`: free text → mood enum via LlmProvider; Zod JSON; rate limit; Redis cache; fallback; LLM never invents books; in-stock only
  - [ ] Web: mood picker on homepage, results page, “why this book” tooltip
- **ACCEPTANCE:** Full feature with LLM off; never OOS books; cached rec p95 < 150ms

---

### P15 — Publisher growth tools (E · Differentiators)

- **Goal:** Publisher tooling (`FEATURE_SPONSORED=true` for campaigns)
- **Deliverables:**
  - [ ] Sponsored campaigns: budget, dates, genre + follower targeting only; signed tracking ids; dashboard CTR, conversion, revenue, cost, ROAS; billing = manual invoice for now
  - [ ] Reprint demand: “Request reprint” OOS (one/user); publisher counts by date/district + trend
  - [ ] Release countdown + notify-me, pre-order flag, flash sale, bundle (buy 2 get 1) — **server-side in quote**; countdown uses server time
  - [ ] Pin standout review/post + notify author
- **ACCEPTANCE:** Analytics match seeded events; bundle/flash not client-tweakable

---

### P16 — Writer tools, events, quote card (E · Differentiators)

- **Goal:** Writer/community events (`FEATURE_LIVE_EVENTS=true`; **no custom video**)
- **Deliverables:**
  - [ ] Writer profile, blog posts, book announcements, follower-only content flag
  - [ ] Beta-reader program: invite by eligibility (purchases, review helpfulness, badges, abuse score); deadline; required review; points via PointLedger
  - [ ] AMA / live launch room: Socket.io + Redis adapter; moderated chat; pinned book + Buy; question queue; countdown; rate limits; **external live link only**
  - [ ] Quote card generator: client html-to-image lazy island (NOT Satori for Bangla); 1080×1920 story + 1080×1080 square; watermark; user-selected quote only
- **ACCEPTANCE:** Chat reconnect; banned users cannot write; Bangla conjuncts OK on Android Chrome + iOS Safari

---

### P17 — Local hardening & launch prep (F · Hardening)

- **Goal:** Production readiness **locally** — **no new features**
- **Deliverables:**
  - [ ] OWASP Top 10 review: deps, headers, CORS, CSRF/Origin, upload abuse, SSRF in ISBN/image fetchers, raw SQL, mass assignment, **IDOR sweep all routes**, rate-limit report, **admin 2FA**
  - [ ] k6 load test locally (browse/search/checkout mix): p95, errors, DB connections, Redis memory
  - [ ] `pnpm backup` (pg_dump `./backups`) + tested restore; Redis persistence; DLQ in admin; structured logs + request ids
  - [ ] Reconcile money + points on seed + simulated data; re-review every ledger write path
  - [ ] Static drafts: Terms, Privacy, Refund/Return, Seller Agreement (**BN + EN**), unpublished until hosting
  - [ ] Update FUTURE_PLAN VERIFY-BEFORE-LAUNCH statuses
  - [ ] Prepare (do not run) Dockerfiles for web, api, worker
- **ACCEPTANCE:** All tests green; backup→restore OK; written report: VERIFY list, k6, security checklist

---

## Appendix A–D requirements

### Appendix A — Core Prisma schema (paste into P3)

**Enums (representative):**

- `Role`: USER, WRITER, PUBLISHER, VENDOR, ADMIN, RIDER (RIDER = feature off)
- `UserStatus`: ACTIVE, SUSPENDED, BANNED
- `ListingType`: NEW, USED
- `BookCondition`: NEW, LIKE_NEW, GOOD, FAIR, READABLE
- `PaymentMethod`: COD, SSLCOMMERZ
- `PaymentStatus`: INITIATED, PAID, FAILED, REFUNDED
- `OrderStatus`: PENDING, CONFIRMED, PROCESSING, PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RETURN_REQUESTED, RETURNED, REFUNDED, DISPUTED
- `LedgerKind`: SALE, COMMISSION, PAYMENT_FEE, DELIVERY_FEE, COD_REMIT, RTO_COST, REFUND, PAYOUT, ADJUSTMENT
- `LedgerStatus`: PENDING, AVAILABLE, PAID, REVERSED

**Core models (minimum in appendix; P3 extends):**

- `User` (role, status, isVerified “blue tick”, trustScore 0–100, pointsBalance cache)
- `Follow`, `Book`, `Listing` (price Decimal(12,2), reservedQty, type NEW|USED)
- `Checkout` (idempotencyKey unique, one Payment)
- `Order` (per seller), `OrderItem` (commission snapshots)
- `Payment`, `PaymentEvent` (unique provider+eventId)
- `Shipment` (courier, codAmount, codRemittedAt)
- `LedgerEntry` (immutable amount/kind/owner; idempotencyKey unique)
- `Payout`, `PointLedger` (append-only, unique userId+reason+refId)
- `CommissionRule`, `SystemSetting`, `AdminAuditLog`

**P3 must add (non-exhaustive relation list):** Better Auth tables, OrderStatusHistory, Claim, Block, Review, BookshelfItem, ReadingGoal, Wishlist, Notification(+Preference), Post, Comment, Reaction, Report, ReprintRequest, BookClub, ClubMember, Campaign, WriterProfile, PublisherProfile, VendorProfile, RoleApplication.

---

### Appendix B — Follow policy (paste into P4)

- **Matrix:**
  - USER → USER, WRITER, PUBLISHER, VENDOR: **yes**
  - WRITER → USER: **only if user already follows writer**; → WRITER, PUBLISHER: yes; → VENDOR: no
  - PUBLISHER → USER: **NEVER**; → WRITER, PUBLISHER: yes; → VENDOR: no
  - VENDOR → **nobody**
- Cannot follow self, ADMIN, RIDER, or blocked parties
- Writer→User follow-back: check + insert **one transaction**
- Unfollow writer → remove writer’s follow-back
- Block → remove follows both ways
- Rate limit **50/hour**; mass-follow → risk score, never auto-ban
- Publisher promo posts **max 3/day**; sponsored posts **`isSponsored` + “Sponsored” label**
- Reference `canFollow(actor, target, ctx)` shape in PDF

---

### Appendix C — Money flow & settings (paste into P6, P7)

**SystemSetting defaults (never hard-code in app logic):**

| Key                | Default  |
| ------------------ | -------- |
| claim_window_hours | 48       |
| escrow_days        | 7        |
| min_payout_amount  | 500 BDT  |
| cod_new_user_cap   | 1500 BDT |
| cod_min_trust      | 30       |

**PREPAID flow:** checkout recompute → reserve → Payment INITIATED → gateway URL → IPN validates → PaymentEvent idempotency → PAID → Orders CONFIRMED → ledger entries → DELIVERED sets availableAt → hourly escrow release → claim/dispute freeze → payout batch.

**COD flow:** CONFIRMED without gateway; shipment codAmount; **no ledger until remit**; availableAt = max(deliveredAt, codRemittedAt) + escrow_days; RTO restock + RTO_COST + trustScore; guards as above.

**Rules:** integer paisa internally; half-up commission; sellerAmount + commission === lineTotal; idempotency on all ledger writes; only escrow service changes ledger status/availableAt; corrections = ADJUSTMENT; daily reconcile; seller ledger privacy; margin guard vs gateway fee; **TEST CLOCK** for escrow.

---

### Appendix D — Commission rules (seed in P3; used P6+)

- **Standard 10%** (`bps 1000`) via `CommissionRule` rows — **never constants in code**
- Resolution: most specific valid rule wins; tie → higher priority; snapshot on OrderItem at checkout

**Seed rules (PDF table):**

| scope   | scopeRef           | bps  | validTo   | note                                      |
| ------- | ------------------ | ---- | --------- | ----------------------------------------- |
| GLOBAL  | —                  | 1000 | —         | 10% baseline                              |
| ROLE    | PUBLISHER_FOUNDING | 400  | +6 months | first 10 Founding Publishers (2–4% range) |
| ROLE    | PUBLISHER_VERIFIED | 600  | +6 months | launch offer                              |
| ROLE    | WRITER             | 600  | +6 months | launch offer                              |
| ROLE    | VENDOR             | 800  | +6 months | launch offer                              |
| LISTING | USED               | 1000 | —         | used-book sales                           |

- After `validTo` → GLOBAL 10%
- Margin guard admin warning if commission below gateway + courier + minimum margin
- Every rule change → AdminAuditLog
- **Bangla note in PDF:** 10% is general; founding 2–4% for first 10 publishers × 6 months; rates finalized with publishers; must cover gateway + courier

---

## Feature flags

From P1 `.env.example` (default **false** unless noted):

| Flag                  | Gates                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `FEATURE_RIDER`       | RIDER role / rider logistics (overview: **own rider app out of scope**; role exists but off) |
| `FEATURE_LIVE_EVENTS` | P16 AMA / live rooms (external stream link only)                                             |
| `FEATURE_SPONSORED`   | P11 sponsored feed slots; P15 campaigns                                                      |
| `FEATURE_MOOD_LLM`    | P14 optional LLM mood classification                                                         |
| `FEATURE_USED_BOOKS`  | P13 used-book marketplace + ISBN flow                                                        |

**Rule (AGENTS.md #15):** When off → routes **not registered** + UI **hidden**.

**Related env (not FEATURE\_*):** `LLM_PROVIDER=off`, `SEARCH_PROVIDER=pg`, provider toggles via `*_PROVIDER`.

---

## Pages / routes expected (frontend)

### Explicit Astro/static routes (from prompts)

| Route                                           | Prompt                  | Purpose                                                  |
| ----------------------------------------------- | ----------------------- | -------------------------------------------------------- |
| `/`                                             | P2                      | Home placeholder → mood picker (P14), discovery sections |
| `/design`                                       | P2                      | Dev-only design system / tokens / moods                  |
| `/login`                                        | P4                      | Auth (middleware redirect target)                        |
| `/register`                                     | P4                      | Sign up                                                  |
| verify email / phone flows                      | P4                      | Verification islands                                     |
| forgot / reset password                         | P4                      | Password recovery                                        |
| `/books/:slug` (implied)                        | P5                      | Book detail + listings + Look Inside + JSON-LD           |
| Author page                                     | P5                      | Author catalog                                           |
| Publisher page                                  | P5                      | Publisher catalog                                        |
| Category / genre pages                          | P5                      | Browse by genre                                          |
| `/search`                                       | P5                      | Search + filters + autocomplete island                   |
| Cart (drawer + page flow)                       | P6                      | Cart drawer; checkout flow                               |
| Checkout                                        | P6                      | Address, delivery, coupon, payment method, confirm       |
| Order list & order detail                       | P6, P8                  | Orders + courier tracking timeline                       |
| Seller dashboard(s)                             | P9                      | Publisher/vendor/writer dashboards (role-guarded)        |
| Admin dashboard                                 | P9                      | Admin ops                                                |
| Community / feed                                | P2 nav “Community”, P11 | Feed island, composer                                    |
| Discover                                        | P2 nav                  | Discovery/browse entry                                   |
| Profile                                         | P2 nav                  | User profile area                                        |
| Bookshelf / reading goals                       | P12                     | Shelf board, goal card, progress                         |
| Points history                                  | P12                     | PointLedger UI                                           |
| Mood results                                    | P14                     | Post–mood-picker results                                 |
| Used-book listing create                        | P13                     | Used listing + **ISBN scanner page** (lazy qr)           |
| Publisher tools UI                              | P15                     | Campaigns, reprint demand, countdowns                    |
| Writer profile / blog                           | P16                     | Writer content                                           |
| Live / AMA room                                 | P16                     | Socket.io chat room                                      |
| Quote card tool                                 | P16                     | Lazy island generator                                    |
| Terms, Privacy, Refund/Return, Seller Agreement | P17                     | Static BN+EN drafts (unpublished)                        |

### Shell navigation (P2)

- Header: search box, nav, cart count
- Mobile bottom nav: **Home · Discover · Community · Cart · Profile**

### Schema-backed features without dedicated route names in PDF

- Book clubs (`BookClub`, `ClubMember`) — in P3 schema; overview mentions **book club**
- Role application UI — implied with P4/P9 admin approval
- Notification bell — global island (P10)
- Wishlist — islands on book/search pages (P5/P10)

---

## API / money / auth / social / writer / admin expected

### Health & infra

- `GET /health`
- Webhooks: payment IPN (raw body), courier webhook (verify + idempotent)

### Auth & users

- Better Auth routes (session cookies)
- `GET /me`
- `POST /role-applications`; admin approve/reject
- `POST /users/:id/follow`, `DELETE /users/:id/follow`

### Catalog & search

- `GET /books`, `GET /books/:slug`
- `GET /search`, `GET /search/suggest`
- Publisher/vendor listing CRUD + image upload (local storage)
- Look Inside upload + admin approval pipeline
- `GET /isbn/:isbn` (P13)

### Commerce

- `POST /checkout/quote`, `POST /checkout` (Idempotency-Key)
- Payment session creation + SSLCommerz redirect flow
- Order state transitions (service-layer only)
- Claim creation + admin resolution
- Payout batch (admin)
- `pnpm reconcile`, `pnpm sim:ipn`, `pnpm sim:courier`

### Courier

- Shipment create on PACKED (async)
- Tracking + webhook status map + polling fallback

### Reviews & wishlist (P10)

- Review CRUD with verified-buyer enforcement
- Wishlist add/remove; alert triggers on listing price/stock change

### Notifications (P10)

- In-app notifications + email via provider
- Preference checks per event type

### Social (P11)

- Posts, comments, reactions, save, report, feeds (following/trending/mixed)
- Moderation admin APIs + ModerationLog

### Reading & points (P12)

- Bookshelf CRUD + ReadingGoal
- `awardPoints` service (only writer to pointsBalance)
- Badges job output exposed to profile

### Discovery (P14)

- Mood query endpoints + MoodLog (consent)
- Recommendation sections endpoint(s)
- Optional LLM mood classify endpoint behind flag

### Publisher (P15)

- Campaign CRUD + analytics events
- ReprintRequest aggregation
- Pre-order / flash / bundle rules in quote service

### Writer & events (P16)

- Writer profile, blog, announcements
- Beta-reader invitations
- Socket.io room endpoints for AMA/live

### Admin (P9, scattered)

- Users, role applications, seller verification
- Orders, claims queue, payouts
- CommissionRule + SystemSetting CRUD (audit logged)
- Margin-guard warnings, KPI aggregates
- Moderation queue (P11)
- Dead-letter queue visibility (P10/P17)

### Roles & capabilities (overview PDF)

| Role          | Expected capabilities                                               |
| ------------- | ------------------------------------------------------------------- |
| **USER**      | Buy, review, bookshelf, social, used-book sell (verified), wishlist |
| **WRITER**    | Posts, AMA, follow-back rules, seller dashboard subset              |
| **PUBLISHER** | Listings, Look Inside, sponsored/reprint tools, analytics           |
| **VENDOR**    | Listings/stock/orders (no follow outbound)                          |
| **ADMIN**     | Full ops, disputes, payouts, settings, moderation                   |
| **RIDER**     | Feature-flag off; not in scope for own app                          |

### Money & ledger invariants (cross-cutting)

- Decimal(12,2) storage; paisa integer math; round half-up
- LedgerEntry amount/kind/owner immutable; escrow mutates status/availableAt only
- Balances = SUM(ledger); PointLedger = source of truth for points
- Every money write: DB transaction + idempotencyKey
- AdminAuditLog on business setting changes

### Security baseline (AGENTS.md)

- Helmet, strict CORS (credentials, localhost:4321)
- Redis rate limits: auth, otp, follow, post, search, checkout
- Origin check on mutations
- Upload MIME + size limits
- No secrets in git; `.env.example` maintained

---

## Explicit OUT OF SCOPE

From AGENTS.md / PDF Prompt 0 (do **not** build unless asked):

- Own **Rider** app (RIDER role exists but `FEATURE_RIDER=false`)
- **Video streaming** (live = external link only)
- **Native mobile app**
- **Subscription billing**
- **ML recommendations** (rule-based OK; LLM mood classify optional behind flag)
- **Smooth-scroll libraries**
- **3D hero**
- **Any hosting setup** in local-first phase (Dockerfiles prepared in P17 only)

Additional P13 note: **duplicate-photo detection** for used listings = out of scope.

P16: **No custom video** for live events.

---

## Deviations called out in PDF if any

### Overview PDF (BookVerse_Project_Overview.pdf)

1. **Google Doc vs repo:** Separate Google doc may mention **~8% hosting**, Cloudflare/Oracle, etc. PDF states **PDF + .md files do not commit** to that hosting path — local-first remains authoritative for agents.
2. **Third-party verification:** **SSLCommerz, Steadfast, Pathao** — real API/signatures must follow **current official docs**; unverified → adapter + **VERIFY-BEFORE-LAUNCH** in `docs/FUTURE_PLAN.md`.
3. **COD at launch:** Overview notes **COD SMS** (e.g. order confirmation) may be required at real launch — not necessarily full local MVP.
4. **Business targets vs engineering:** 15 crore GMV, 10k users, founding publisher commission **2–4% for 6 months** — business goals; commission table in Appendix D is seed data subject to publisher negotiation (PDF Bangla note).
5. **Rokomari positioning:** Strategic differentiation (social + used + publisher tools) — not a technical deviation.

### Step-by-Step PDF

1. **Palette v1 → v2:** Background changed from cold `#F8FAFC` to warm **cream `#FBF7F0`**; orange CTA text **ink-900** (was white — contrast fix); AGENTS.md updated accordingly.
2. **Preact vs other React stacks:** Spec mandates **Preact compat**, not React — repo root `AGENTS.md` may say `frontend/` + **React**; PDF/projectFiles say **`apps/web` + Preact** (audit should treat PDF as spec source unless repo explicitly migrated).
3. **Folder naming:** PDF uses `apps/web`, `apps/api`; some repo docs use `frontend/`, `backend/` — same monorepo intent, different folder names.
4. **Steadfast / SSLCommerz:** Adapters must be written from **current** docs; Steadfast **off** until verified; simulators required locally.
5. **Quote cards:** Must **not** use server Satori for Bangla — client html-to-image only (PDF explicit).
6. **Sponsored billing:** Manual invoice for now (not automated billing).
7. **PostGIS “near me”:** District filter first; radius search only if demand — avoid premature PostGIS.
8. **Audio reviews:** “Photos allowed; **audio later**” (P10).
9. **Agent workflow:** AI must **stop after each prompt**; never skip ACCEPTANCE; user must review money/auth/follow/webhook diffs manually.

### projectFiles AGENTS.md vs repository root AGENTS.md

- **projectFiles** matches PDF Prompt 0 (`apps/*`, Preact).
- **Repo root** AGENTS.md (if present) may list `frontend/backend` and **React** — flag as **implementation deviation** during audit unless harmonized.

---

## Overview PDF feature checklist (Bangla section themes)

For traceability to **BookVerse_Project_Overview.pdf** section headings (content aligned with prompts):

- **এটা কী** — Social-commerce for books in BD; bilingual; vs pure marketplace
- **কার বাংলাদেশে কার কাজ** — USER / WRITER / PUBLISHER / VENDOR / ADMIN / RIDER (off)
- **মূল বিশেষত্ব** — E-commerce (used, Look Inside, COD, online pay, courier tracking); social (feed, comments, spoiler, verified reviews, bookshelf, book club); virality (shelf, goals, sharing)
- **প্রথম/ভিন্ন** — Offline-friendly used listing, ISBN for publishers, sponsored posts + analytics, quote cards, author live Q&A
- **স্ট্যাক** — Astro+Preact, Express, Prisma, Redis, Better Auth, providers
- **টাকার নিয়ম** — Escrow, 48h claim, 7-day escrow, commission 10% / founding 2–4%, ledger + points
- **ব্যবসায়িক বাস্তবতা** — GMV/user targets, COD/RTO risk, margin guard
- **আরও কী তৈরি আছে** — 22-page prompt PDF, companion md files, Google doc (non-binding for hosting)
- **প্রথম prompt মানচিত্র** — Phases A–F (P1–17)
- **খরচ** — Local 0 Tk; domain/hosting/SMS later
- **এজেন্টের জন্য** — Follow AGENTS.md; each prompt has ACCEPTANCE; do not batch prompts

---

_Generated for audit use. Re-extract if source PDFs change._
