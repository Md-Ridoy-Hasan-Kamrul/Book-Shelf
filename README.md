# BookVerse

Local-first social-commerce for books in Bangladesh. Rules: `AGENTS.md`. Progress: `PROJECT_FLOW.md`.

## Repo layout

```
frontend/          # Astro + React web app
backend/           # Express API + Prisma
packages/shared/   # Zod schemas, env, HTTP envelopes
```

## Stack

| Layer    | Location                                                         |
| -------- | ---------------------------------------------------------------- |
| Frontend | `frontend/` — Astro SSR (`@astrojs/node`) + **React** + Tailwind |
| Backend  | `backend/` — Express + Zod + Pino + provider registry            |
| Shared   | `packages/shared` — env + HTTP envelopes (Zod), **tsup** build   |

## Prerequisites

- Node `>=22.12.0`, pnpm 10, **Docker Desktop** (Postgres, Redis, Mailpit)

**Backend is on hold** (folder kept, not deleted). Frontend runs on **JSON mocks by default**.

- `pnpm dev` → Astro web only; `PUBLIC_USE_MOCK_DATA` defaults **on** (set `false` only for live API).
- Fixtures: `frontend/src/data/mock-books.json` + `frontend/src/lib/mockApi.ts`.
- **Full stack later:** Docker + `PUBLIC_USE_MOCK_DATA=false` + `pnpm dev:stack`.
- **PDF read-online (no download):** put files in `content/pdfs/<book-slug>.pdf` (see that folder’s README). Demo: `/books/padma-nodir-majhi` → **Read online**.

## Setup

```bash
cp .env.example .env
pnpm install
# UI only (JSON mocks — no Postgres/Redis):
pnpm dev
# Or full local stack:
# pnpm docker:up && pnpm db:migrate && pnpm db:seed && pnpm dev:stack
```

| URL                          | Service                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| http://localhost:4321        | Web                                                          |
| http://localhost:4321/design | Design tokens                                                |
| http://localhost:4321/mood   | Mood discovery results (chip → DB `moodTags`)                |
| http://localhost:4000/health | API health (Postgres + Redis when `HEALTH_SKIP_INFRA=false`) |
| http://localhost:8025        | Mailpit UI                                                   |

## Commands

| Command            | Action                    |
| ------------------ | ------------------------- |
| `pnpm dev`         | Web only (mock data OK)   |
| `pnpm dev:stack`   | Web + API + worker        |
| `pnpm build`       | shared → web → api        |
| `pnpm lint`        | ESLint                    |
| `pnpm typecheck`   | TypeScript                |
| `pnpm test`        | Vitest                    |
| `pnpm test:e2e`    | Playwright                |
| `pnpm db:migrate`  | Apply migrations          |
| `pnpm db:seed`     | Dev seed                  |
| `pnpm sim:courier` | Courier webhook simulator |
| `pnpm bench:feed`  | Feed latency bench        |

## P14 mood / recommend (local-first)

- Mood chips + `/discover/mood` query `Book.moodTags` (no LLM). Copy: _these books may match your mood_.
- Rule-based `/discover/recommend` (weights in `SystemSetting.recommend_weights`), 10‑minute Redis cache, in-stock only.
- Optional free-text classify: `FEATURE_MOOD_LLM=true` + `LLM_PROVIDER=mock` (default `off` uses rule fallback when enabled).

## P15 publisher growth (`FEATURE_SPONSORED=true`)

- Sponsored campaigns: genre + follower targeting only; impression/click/ATC/purchase via signed tracking IDs; dashboard CTR/conversion/revenue/cost/ROAS; manual invoice.
- Reprint request (1/user/book) + publisher demand by date/district + trend.
- Release countdown (server time), notify-me, pre-order; flash + bundle in quote service only.
- Feature review/post → notify author. UI: `/publisher/growth`.

## P17 local hardening (no new features)

- Report: `docs/HARDENING_REPORT.md` · VERIFY list: `docs/FUTURE_PLAN.md`
- `pnpm backup` / `pnpm restore` · `pnpm reconcile` · `pnpm verify:points` · `pnpm audit:deps` · `pnpm load:k6`
- Legal drafts: `/legal/terms|privacy|refund|seller` · Dockerfiles prepared under `frontend/` + `backend/`

## P16 writer tools / live (`FEATURE_LIVE_EVENTS=true`)

- Writer profiles (`/writers/:slug`), blog + book announcements, `followersOnly` posts.
- Beta-reader invites by eligibility score (purchases + helpfulness + badges − abuse), deadlines, rewards via `awardPoints` / PointLedger.
- AMA room: Socket.io + Redis adapter, moderated chat, question queue, pinned book Buy, countdown, rate limits; **external live URL only** (no self-hosted video).
- Quote card: lazy island + client `html-to-image` (1080×1920 / 1080×1080), Hind Siliguri for Bangla conjuncts.
