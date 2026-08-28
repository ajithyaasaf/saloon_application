# Multi-stage Dockerfile for NestJS API Application
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root monorepo files for workspace resolution
COPY package.json pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/config/package.json ./packages/config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Generate Prisma Client & build workspace packages
RUN pnpm --filter @saloon/database prisma:generate
RUN pnpm --filter @saloon/shared-types build
RUN pnpm --filter @saloon/shared-utils build
RUN pnpm --filter @saloon/config build
RUN pnpm --filter @saloon/api build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/config/package.json ./packages/config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built dist files and generated Prisma client
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3000

# Run container as non-root user (least privilege)
USER node

CMD ["node", "apps/api/dist/main"]

