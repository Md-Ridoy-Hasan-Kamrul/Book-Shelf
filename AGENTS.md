## Project

BookVerse. Read `README.md` first: it holds the plan, roles, money rules, and the A–F build path (P1–P17).

- Web lives at the repo root: Astro + React + Tailwind + TypeScript. Interactive UI is React `.jsx`/`.tsx` islands with `client:*` directives. Do not use Preact.
- API lives in `api/`: Node + Express + Zod, its own `package.json`. Validate every request body and env var with Zod.
- Add libraries only in the step that needs them (TanStack Query, Zustand, Prisma, Redis, BullMQ, Better Auth).
- Every external service (payment, courier, images, email, SMS) goes behind a provider interface with a mock default, switched by `.env`.
- Money and points are append-only ledgers. Never update or delete a ledger row.
- Finish each prompt by running its ACCEPTANCE checks: `npm test`, `npm run build`, `npm run test:api`, `npm run test:e2e`.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
