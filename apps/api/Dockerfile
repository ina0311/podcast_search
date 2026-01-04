# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
ENV PNPM_REQUIRE_SCRIPTS_APPROVAL=false
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl && corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/search-core/package.json packages/search-core/package.json
RUN pnpm config set require-scripts-approval false \
  && pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm -C packages/db prisma:generate \
  && pnpm --filter @podcast_search/config build \
  && pnpm --filter @podcast_search/search-core build \
  && pnpm --filter @podcast_search/db build \
  && pnpm --filter api build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/index.js"]

