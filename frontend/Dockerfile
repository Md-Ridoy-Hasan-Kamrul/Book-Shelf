# P17 — prepared for later hosting (do not run in local-first mode unless asked)
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared ./packages/shared
COPY frontend ./frontend
ARG PUBLIC_API_URL=http://localhost:4000
ENV PUBLIC_API_URL=$PUBLIC_API_URL
RUN pnpm --filter @bookverse/shared build && pnpm --filter @bookverse/web build

FROM node:22-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY --from=build /app /app
WORKDIR /app/frontend
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
