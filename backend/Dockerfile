# P17 — prepared for later hosting (do not run in local-first mode unless asked)
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared ./packages/shared
COPY backend ./backend
RUN pnpm --filter @bookverse/shared build && pnpm --filter @bookverse/api build

FROM node:22-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "--env-file-if-exists=../.env", "dist/index.js"]

FROM node:22-bookworm-slim AS worker
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/backend
CMD ["node", "--env-file-if-exists=../.env", "dist/worker.js"]
