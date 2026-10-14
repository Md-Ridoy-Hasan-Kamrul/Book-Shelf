# BookVerse

বাংলাদেশের জন্য বই কেনাবেচা ও সোশ্যাল রিডিং — **local-first**, ০ টাকা। Full plan: `AGENTS.md`, progress: `PROJECT_FLOW.md`.

## Stack (P1)

| Layer | Tools |
| --- | --- |
| Web | Astro SSR (`@astrojs/node`) + React + Tailwind + TypeScript |
| State | TanStack Query (`src/lib/queryClient.ts`), Zustand (`src/stores/`) |
| API | Node + Express + Zod + Helmet |
| Shared | `packages/shared` — Zod schemas |
| Local infra | Docker: Postgres, Redis, Mailpit |

## Structure

```text
apps/web/          Astro + React (/, /design)
apps/api/          Express API (/health)
packages/shared/   Shared Zod types
docker-compose.yml
```

## Commands

| Command | Action |
| --- | --- |
| `pnpm install` | Install all workspaces |
| `pnpm dev` | Web `:4321` + API `:4000` |
| `pnpm docker:up` | Postgres, Redis, Mailpit |
| `pnpm build` | shared → web → api |
| `pnpm test` | Vitest (web + api) |
| `pnpm test:e2e` | Playwright (web) |

Copy `.env.example` → `apps/api/.env` when you wire Prisma (P3).

## Design

Fresh & Human palette: **`/design`** on the dev server.

Island pattern:

```astro
---
import BuyButton from '../components/BuyButton.jsx';
---

<BuyButton id={product.id} client:load />
```
