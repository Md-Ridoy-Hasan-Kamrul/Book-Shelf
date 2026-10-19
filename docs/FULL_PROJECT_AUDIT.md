# BookVerse — Full project audit (PDF ↔ code)

**Date:** 2026-10-19 (gaps fixed same day)  
**Sources:** `frontend/projectFiles/` (AGENTS.md + both PDFs) + root `AGENTS.md` / `CLAUDE.md` + live `frontend/` / `backend/` / `packages/shared/`  
**Detail extracts:** [`_AUDIT_SPEC_EXTRACT.md`](./_AUDIT_SPEC_EXTRACT.md), [`_AUDIT_CODEBASE.md`](./_AUDIT_CODEBASE.md)

### Post-audit fixes applied

- SiteShell: Discover→`/mood`, Profile→`/account`, search GET `/search`, Used nav only if `FEATURE_USED_BOOKS`
- Middleware redirects for used/sponsored/live pages when flags off
- Backend: `/isbn` + `/used-listings` only registered when `FEATURE_USED_BOOKS`
- `/account` + role-apply form; Follow/Block on writer profiles
- `projectFiles/AGENTS.md` synced to root (React + `frontend/`/`backend/`)

---

## Verdict (one line)

**Core commerce + money + auth + social backend + design tokens ≈ MATCH.**  
**Product gaps are mostly frontend surfaces + feature-flag UI hiding + a few PDF doc mismatches** (Preact/`apps/*` in projectFiles AGENTS vs live React/`frontend`).

---

## A–Z scorecard

| Area                           | Status  | Notes                                                                                                                                      |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **P0 AGENTS**                  | MATCH*  | Root AGENTS = React + `frontend/`/`backend/`. `projectFiles/AGENTS.md` still says Preact + `apps/web` — **stale**.                         |
| **P1 Monorepo/Docker/CI**      | MATCH   | pnpm workspaces, docker-compose, CI, health, providers. Folder names intentional deviation.                                                |
| **P2 Design / shell**          | PARTIAL | Tokens exact in `global.css`. UI kit present. Bottom nav ≠ PDF (no Profile; has Shelf/Used). Header search does not navigate to `/search`. |
| **P3 Schema/seed**             | MATCH*  | Appendix A mapped (not literal names). Seed + money 1000 random tests OK.                                                                  |
| **P4 Auth/follow**             | PARTIAL | Better Auth, `/me`, canFollow Appendix B **backend MATCH**. **No Follow/Block UI**. Role-apply API exists; **no user apply UI**.           |
| **P5 Catalog/search**          | MATCH*  | Books/search/pages. Seller create-book / look-inside **FE thin**.                                                                          |
| **P6 Cart/checkout**           | MATCH   | Quote, idempotent checkout, COD guards, cart drawer, orders.                                                                               |
| **P7 Money**                   | MATCH   | IPN, ledger, escrow, claims, payouts, COD remit, reconcile, TEST_CLOCK.                                                                    |
| **P8 Courier**                 | MATCH*  | Mock + Steadfast off + sim. Live Pathao/RedX rails open (PROJECT_FLOW unchecked).                                                          |
| **P9 Dashboards**              | MATCH*  | Seller/admin islands. Admin money ops mostly script/API not full UI.                                                                       |
| **P10 Reviews/wishlist/notif** | MATCH   | Worker, alerts, bell.                                                                                                                      |
| **P11 Feed**                   | MATCH   | Feed, composer, sponsored label, caps.                                                                                                     |
| **P12 Bookshelf/points**       | MATCH   | awardPoints-only, badges, points page.                                                                                                     |
| **P13 Used/ISBN**              | PARTIAL | Implemented; **UI/nav visible when FEATURE_USED_BOOKS=false** (AGENTS rule 15).                                                            |
| **P14 Mood/rec**               | MATCH   | Mood page + recommend; LLM optional.                                                                                                       |
| **P15 Publisher growth**       | PARTIAL | Backend gated by FEATURE_SPONSORED; **page still reachable**.                                                                              |
| **P16 Writer/live/quote**      | PARTIAL | Backend gated by FEATURE_LIVE_EVENTS; writer page/events need flag.                                                                        |
| **P17 Hardening**              | MATCH   | Docs, backup, k6, 2FA, legal, Dockerfiles.                                                                                                 |
| **Appendix A–D**               | MATCH   | Mapping docs + live align (intentional renames).                                                                                           |
| **Colors / UI tokens**         | MATCH   | Fresh & Human v2 in theme. Minor hex fallback in BookshelfBoard.                                                                           |
| **FE ↔ BE flow**               | PARTIAL | Commerce/social core linked. Orphan APIs: follow, role-apply, PATCH /users/me, admin money buttons.                                        |

\* = intentional naming/layout deviation documented.

---

## Design tokens (exact check)

| Token         | Spec                  | `frontend/src/styles/global.css` |
| ------------- | --------------------- | -------------------------------- |
| cream page bg | `#FBF7F0`             | `--color-cream: #fbf7f0` ✓       |
| brand-600     | `#2563EB`             | ✓                                |
| cta-500       | `#F97316`             | ✓                                |
| leaf-600      | `#16A34A`             | ✓                                |
| 10 mood chips | PDF table             | `--color-mood-*` ✓               |
| radius 12px   | yes                   | `--radius-card: 12px` ✓          |
| Fonts         | Hind Siliguri + Inter | `@fontsource` packages ✓         |

**Component hex rule:** only `BookshelfBoard.tsx` uses fallback `#2563eb` / `#F3EDE2` inside `var(..., fallback)` — minor.

---

## Mobile bottom nav (PDF vs live)

| PDF (P2)  | Live `SiteShell.tsx`                                       |
| --------- | ---------------------------------------------------------- |
| Home      | Home `/` ✓                                                 |
| Discover  | Discover → `/#features` (should be `/mood` or `/search`) ✗ |
| Community | Community `/feed` ✓                                        |
| Cart      | Cart `/checkout` ✓                                         |
| Profile   | **Missing** — replaced by Shelf + Used ✗                   |

---

## Feature flags (AGENTS rule 15)

| Flag                | Backend                    | Frontend hide when off                 |
| ------------------- | -------------------------- | -------------------------------------- |
| FEATURE_SPONSORED   | Routes not registered ✓    | `/publisher/growth` still open ✗       |
| FEATURE_LIVE_EVENTS | `/writer` not registered ✓ | `/writers/*`, `/events/*` still open ✗ |
| FEATURE_USED_BOOKS  | Mounted but 403 ✗ strict   | Nav “Used” + pages always ✗            |
| FEATURE_MOOD_LLM    | Action gated ✓             | N/A ✓                                  |
| FEATURE_RIDER       | Enum only ✓                | N/A ✓                                  |

---

## Missing / weak product surfaces (priority)

1. **Follow / Block UI** — API + policy complete; no buttons on profiles/feed.
2. **Profile page** — bottom-nav Profile missing; no `/profile` or account settings using `PATCH /users/me`.
3. **Role application UI** — users cannot apply WRITER/PUBLISHER/VENDOR from FE.
4. **Header search** — input does not submit to `/search?q=`.
5. **Seller catalog create / look-inside FE** — API exists; dashboard mostly read/pack.
6. **Admin money UI** — reconcile / COD remit / payout-run exist as API; dashboard incomplete.
7. **BookClub** — Prisma model present; no routes/UI (optional differentiator).
8. **Live courier payout rails** — explicitly open in PROJECT_FLOW (out of local-first scope OK).

---

## Intentional deviations (OK — do not “fix” blindly)

| PDF / projectFiles          | Live                                               | Why OK                                       |
| --------------------------- | -------------------------------------------------- | -------------------------------------------- |
| `apps/web`, `apps/api`      | `frontend/`, `backend/`                            | README + root AGENTS                         |
| Preact                      | React                                              | Root AGENTS / CLAUDE                         |
| Literal Appendix A names    | Better Auth + OrderLineItem / PaymentIntent / etc. | `docs/APPENDIX_A_MAPPING.md`                 |
| SSLCOMMERZ enum             | `ONLINE` + provider field                          | Appendix C mapping                           |
| route→controller→repository | route→service (+ some Prisma in routes)            | Practical layering; PARTIAL vs golden rule 5 |

---

## Flow match (happy paths)

| Flow                                               | FE → BE                       | Status |
| -------------------------------------------------- | ----------------------------- | ------ |
| Browse → book → cart → quote → COD/online checkout | pages + CartDrawer + checkout | ✓      |
| Pay → IPN → ledger → deliver → escrow → payout     | services + worker + sims      | ✓      |
| Feed → post/like/comment                           | SocialFeed + posts API        | ✓      |
| Mood → results                                     | MoodPicker + `/discover/mood` | ✓      |
| Seller pack → shipment → track                     | dashboard + courier           | ✓      |
| Follow writer                                      | API only                      | ✗ UI   |
| Apply as publisher                                 | API only                      | ✗ UI   |

---

## How to verify manually

```powershell
# Tokens / design
start http://localhost:4321/design

# Flags off by default — used/growth should fail or hide after fixes
# Money
pnpm sim:ipn <tranId>
pnpm reconcile
pnpm verify:points
```

---

## Recommended fix order (if you ask next)

1. Sync `frontend/projectFiles/AGENTS.md` → React + `frontend/`/`backend/` (doc only).
2. Fix SiteShell: Profile link + Discover→`/mood` + search→`/search`; hide Used/events/growth when flags false.
3. Follow button on writer/publisher pages; role-apply form under account.
4. Remove BookshelfBoard hex fallbacks.

---

_This audit did not change application code. Supporting extracts: `_AUDIT_SPEC_EXTRACT.md`, `_AUDIT_CODEBASE.md`._
