# AGENTS.md — BookVerse (Local-first)

(Claude Code ব্যবহার করলে এই ফাইল CLAUDE.md নামেও রাখুন।)

## PROJECT

BookVerse (working name) - social-commerce platform for books in Bangladesh. Currency BDT. Languages: Bangla (primary) + English. Mobile-first. Business: marketplace (publishers, writers, vendors, users selling used books) + social reading community. Launch scale: 10,000 active users, peak ~1,000 concurrent. Long-term GMV goal 15 crore BDT/yr.

## CURRENT MODE: LOCAL-FIRST, ZERO COST

No domain, no hosting, no paid service. Everything runs on the developer machine via docker-compose (postgres, redis, mailpit). Every external service sits behind a provider interface in `backend/src/providers/<name>/` with a local/mock implementation (default) and a real implementation (selected by env, see README).

Do NOT add Cloudflare, Vercel or Render adapters now. Use `@astrojs/node`. Future upgrades are listed in `docs/FUTURE_PLAN.md`; do not implement them unless asked.

## FIXED STACK (do not substitute without asking)

- Monorepo (pnpm workspaces): `frontend/`, `backend/`, `packages/shared`
- `frontend/`: Astro (SSR, `@astrojs/node`) + React + Tailwind CSS + TypeScript strict + TanStack Query + Zustand + GSAP (only small, purposeful animation)
- `backend/`: Node + Express + TypeScript strict + Zod + Prisma + PostgreSQL + Redis + BullMQ
- Auth: Better Auth (DB sessions, role field). Phone OTP via SmsProvider (console in local mode).
- Storage: StorageProvider (local disk now, R2 later). Email: EmailProvider (SMTP->Mailpit now).
- Payments: PaymentProvider (mock / SSLCommerz sandbox now). Courier: CourierProvider (mock now, Steadfast adapter written but off). Search: pg_trgm + simple FTS behind SearchService.
- Tests: Vitest (+ Supertest for API), Playwright for a few critical e2e flows.

## GOLDEN RULES (violating any of these is a bug)

1. The server is the source of truth. Price, stock, coupon, commission, delivery fee, permissions and payment status are ALWAYS computed/verified server-side. Never trust client values.
2. Money: Prisma Decimal(12,2), integer-paisa arithmetic, round-half-up. LedgerEntry amount/kind/owner are immutable (only status/availableAt change, by the escrow service); corrections are new ADJUSTMENT entries. Every money write is inside a DB transaction and has an idempotencyKey. Balances are SUMs. Points follow the same pattern (PointLedger; only awardPoints() touches pointsBalance).
3. Authorization lives in the service layer via policy functions (e.g. canFollow). Routes also use requireAuth/requireRole plus ownership checks. UI hiding is never security.
4. Every input is validated with a Zod schema from `packages/shared`.
5. Layering in api: route -> controller -> service -> repository. No DB access in controllers. No business logic in Astro pages or React components.
6. Lists use cursor pagination (createdAt + id). Never OFFSET for feeds. Prisma select only needed fields. Add composite indexes for real query paths and check with EXPLAIN.
7. Astro islands do not share React Context. Shared state = module singletons (`src/lib/queryClient.ts`, `src/stores/*.ts`). Hydrate SSR data via initialData.
8. Webhooks (payment, courier): raw body, verify per the provider's CURRENT official docs, idempotent (PaymentEvent unique provider+eventId), log, respond fast, heavy work in BullMQ. Never trust browser redirects for payment success. Locally, provide simulator scripts (`pnpm sim:ipn`, `pnpm sim:courier`).
9. Business values (commission, escrow days, claim window, COD limits, point rules) live in the DB (SystemSetting, CommissionRule). Every admin change writes AdminAuditLog.
10. API envelope: `{ success, data, meta }` and `{ success:false, code, message, errors }`. Never leak stack traces.
11. Security baseline: Helmet, strict CORS (credentials, allow `http://localhost:4321` in local mode), Redis rate limits on auth/otp/follow/post/search/checkout, Origin check on mutations, upload MIME + size checks, no secrets in git, `.env.example` maintained.
12. UX baseline: skeleton loading, empty state, error state with retry. 360px mobile baseline. WCAG 2.2 AA, keyboard accessible, prefers-reduced-motion respected.
13. External APIs: read the current official docs before coding. If you cannot verify a behaviour, say so, isolate it behind an adapter and add it to VERIFY-BEFORE-LAUNCH in `docs/FUTURE_PLAN.md`. Never invent endpoints or fields.
14. Prefer free/open-source. Anything paid must be marked PAID DEPENDENCY.
15. Feature flags (`FEATURE_*`) gate optional modules: routes not registered and UI hidden when off.
16. No dead code, no TODO placeholders in shipped paths, no `any` (except documented 3rd-party edge).

## WORKFLOW FOR EVERY TASK

1. Restate scope and list the files you will create/change.
2. Note risks/assumptions.
3. Implement in small steps.
4. Write tests (money, auth, policy and webhook logic are mandatory).
5. Run lint + typecheck + tests and fix failures.
6. Report: what is done, what is NOT done, how I can verify it manually, deviations from the spec and why.
7. Update `PROJECT_FLOW.md` checkbox suggestions and README/docs if commands or env keys changed.

Stop after the task. Do not start the next prompt on your own. Never silently skip a requirement.

## DESIGN TOKENS - "Fresh & Human" palette v2

Only via Tailwind theme, never raw hex in components.

- paper `#FFFFFF` | cream `#FBF7F0` (default page bg) | sand `#F3EDE2` | line `#EAE3D6`
- ink-900 `#1F2A37` | ink-700 `#374151` | ink-500 `#5B6472` | ink-300 `#9AA3B0` (decor only)
- brand-600 `#2563EB` (hover/links brand-700 `#1D4ED8`) | brand-100 `#DBEAFE`
- leaf-600 `#16A34A`, leaf-700 `#15803D` (text/buttons), leaf-50 `#F0FDF4`, leaf-100 `#DCFCE7`
- cta-500 `#F97316` (ink-900 text on it; white text only on cta-700 `#C2410C`)
- sun-100 `#FEF3C7`, sun-200 `#FDE68A` (offers) / sun-800 `#92400E`
- rose-600 `#E11D48` (like only) | urgent-600 `#DC2626` (flash sale, out of stock, errors only) | premium-600 `#7C3AED`

Mood chips (bg/text):

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

Proportion ~70% cream/white, ~15% blue, ~8% leaf green, ~5% orange CTA. Max 2 orange CTAs per screen. Radius 12px, soft warm shadow. Fonts: Hind Siliguri (Bangla) + Inter (English), self-hosted, swap.

## UX COPY: no decorative dashes

User-facing UI must **not** use em dash (`—`), en dash (`–`), or spaced hyphen (`-`) as separators. Prefer `:` / `,` / `.` / Bangla `।` / middot `·`. Compound words and code (`look-inside`, `qty - 1`) are fine. Cursor rule: `.cursor/rules/no-em-dash-ui.mdc`.

## OUT OF SCOPE (do NOT build unless asked)

Own Rider app, video streaming, native mobile app, subscription billing, ML recommendations, smooth-scroll libraries, 3D hero, any hosting setup.
