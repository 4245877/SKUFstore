FROM node:22-alpine AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/storefront/package.json apps/storefront/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN corepack enable && pnpm install --filter storefront... --frozen-lockfile

COPY . .

# Чтобы COPY из builder не падал, даже если public/ отсутствует в репозитории
RUN mkdir -p /app/apps/storefront/public

ENV DEPLOY_TARGET=server
RUN pnpm --filter storefront build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/storefront/.next/standalone ./
COPY --from=builder /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public

EXPOSE 3000

CMD ["node", "apps/storefront/server.js"] 