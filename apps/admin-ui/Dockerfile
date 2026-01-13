# =============================================================================
# Multi-stage Dockerfile for Admin UI
# - dev: 開発用（Vite dev server）
# - prod: 本番用（静的ファイル配信）
# =============================================================================

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" PATH="${PNPM_HOME}:${PATH}"
WORKDIR /app
RUN corepack enable

# -----------------------------------------------------------------------------
# Development Stage
# -----------------------------------------------------------------------------
FROM base AS dev
CMD ["sh", "-c", "pnpm config set store-dir /pnpm/store && pnpm install && pnpm -C apps/admin-ui dev --host 0.0.0.0"]

# -----------------------------------------------------------------------------
# Builder Stage (for production)
# -----------------------------------------------------------------------------
FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter admin-ui build

# -----------------------------------------------------------------------------
# Production Stage
# -----------------------------------------------------------------------------
FROM node:22-alpine AS prod
RUN npm install -g serve
COPY --from=builder /app/apps/admin-ui/dist /app
EXPOSE 8080
CMD ["serve", "-s", "/app", "-l", "8080"]
