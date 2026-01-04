# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
ENV PNPM_REQUIRE_SCRIPTS_APPROVAL=false
WORKDIR /app
RUN apk add --no-cache libc6-compat && corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin-ui/package.json apps/admin-ui/package.json
RUN pnpm config set require-scripts-approval false \
  && pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/admin-ui apps/admin-ui
RUN pnpm --filter admin-ui build

FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/admin-ui/node_modules ./apps/admin-ui/node_modules
COPY --from=build /app/tsconfig.base.json ./
COPY --from=build /app/apps/admin-ui ./apps/admin-ui
WORKDIR /app/apps/admin-ui
EXPOSE 4173
CMD ["pnpm", "preview", "--host", "0.0.0.0"]

