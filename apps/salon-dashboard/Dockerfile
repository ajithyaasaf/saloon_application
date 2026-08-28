# Multi-stage Dockerfile for Next.js Salon Dashboard
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy monorepo configuration
COPY package.json pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/config/package.json ./packages/config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/salon-dashboard/package.json ./apps/salon-dashboard/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/salon-dashboard/ ./apps/salon-dashboard/

# Build shared packages and salon-dashboard
RUN pnpm --filter @saloon/shared-types build
RUN pnpm --filter @saloon/shared-utils build
RUN pnpm --filter @saloon/config build
RUN pnpm --filter @saloon/salon-dashboard build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package.json pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/config/package.json ./packages/config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/salon-dashboard/package.json ./apps/salon-dashboard/

RUN npm install -g pnpm
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/salon-dashboard/.next ./apps/salon-dashboard/.next
COPY --from=builder /app/apps/salon-dashboard/public ./apps/salon-dashboard/public
COPY --from=builder /app/apps/salon-dashboard/next.config.js ./apps/salon-dashboard/next.config.js

EXPOSE 3001

USER node

CMD ["pnpm", "--filter", "@saloon/salon-dashboard", "start"]
