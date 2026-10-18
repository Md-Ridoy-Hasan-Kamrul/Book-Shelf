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

| Command            | Action                    |
| ------------------ | ------------------------- |
| `pnpm dev`         | Web + API + worker        |
| `pnpm build`       | shared → web → api        |
| `pnpm lint`        | ESLint                    |
| `pnpm typecheck`   | TypeScript                |
| `pnpm test`        | Vitest                    |
| `pnpm test:e2e`    | Playwright                |
| `pnpm db:migrate`  | Apply migrations          |
| `pnpm db:seed`     | Dev seed                  |
| `pnpm sim:courier` | Courier webhook simulator |
| `pnpm bench:feed`  | Feed latency bench        |
