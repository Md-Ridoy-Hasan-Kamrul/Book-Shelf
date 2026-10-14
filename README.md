# BookVerse

Local-first social-commerce for books in Bangladesh. Rules: `AGENTS.md`. Progress: `PROJECT_FLOW.md`.

## P1 stack

| Layer  | Location                                                        |
| ------ | --------------------------------------------------------------- |
| Web    | `apps/web` — Astro SSR (`@astrojs/node`) + **React** + Tailwind |
| API    | `apps/api` — Express + Zod + Pino + provider registry           |
| Shared | `packages/shared` — env + HTTP envelopes (Zod), **tsup** build  |

## Prerequisites

- Node `>=22.12.0`, pnpm 10, Docker (Postgres, Redis, Mailpit)

## Setup

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

| URL                          | Service                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| http://localhost:4321        | Web                                                          |
| http://localhost:4321/design | Design tokens                                                |
| http://localhost:4000/health | API health (Postgres + Redis when `HEALTH_SKIP_INFRA=false`) |
| http://localhost:8025        | Mailpit UI                                                   |

## Commands

| Command              | Action                                              |
| -------------------- | --------------------------------------------------- |
| `pnpm dev`           | Web + API                                           |
| `pnpm build`         | shared → web → api                                  |
| `pnpm lint`          | ESLint (all packages)                               |
| `pnpm typecheck`     | TypeScript                                          |
| `pnpm test`          | Vitest                                              |
| `pnpm test:e2e`      | Playwright                                          |
| `pnpm db:validate`   | `prisma validate`                                   |
| `pnpm db:migrate`    | Apply migrations (Postgres)                         |
| `pnpm db:seed`       | Dev seed (200 books, settings, commission rules)    |
| `pnpm db:seed:bench` | Bulk seed (~100k books) for search benchmark        |
| `pnpm bench:search`  | Search p50/p95 report (needs bench seed + Postgres) |
| `pnpm db:explain`    | EXPLAIN checks (trigram + verified-buyer index)     |
| `pnpm db:studio`     | Prisma Studio                                       |
| `pnpm sim:ipn`       | Stub (P5+)                                          |

Both apps import `@bookverse/shared`. Web validates `PUBLIC_*` via `src/env.ts`; API validates full env at startup.
