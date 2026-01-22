# =============================================================================
# Multi-stage Dockerfile for API
# - dev: 開発用（ホットリロード対応）
# - prod: 本番用（最適化ビルド）
# =============================================================================

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" PATH="${PNPM_HOME}:${PATH}"
WORKDIR /app
RUN apk add --no-cache openssl curl && corepack enable

# -----------------------------------------------------------------------------
# Development Stage
# -----------------------------------------------------------------------------
FROM base AS dev
CMD ["sh", "-c", "pnpm config set store-dir /pnpm/store && pnpm install && pnpm db:generate && pnpm -C apps/api dev"]

# -----------------------------------------------------------------------------
# Builder Stage (for production)
# -----------------------------------------------------------------------------
FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm -C packages/database exec prisma generate \
  && pnpm turbo run build --filter=api

# -----------------------------------------------------------------------------
# Production Stage
# -----------------------------------------------------------------------------
FROM base AS prod
ENV NODE_ENV=production PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/config/package.json ./packages/config/package.json
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/search-core/dist ./packages/search-core/dist
COPY --from=builder /app/packages/search-core/package.json ./packages/search-core/package.json

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/index.js"]
