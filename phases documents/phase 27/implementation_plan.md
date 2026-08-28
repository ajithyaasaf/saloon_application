# PHASE 27 — PRODUCTION OBSERVABILITY, PERFORMANCE OPTIMIZATION & DEPLOYMENT READINESS
## ARCHITECTURAL SPECIFICATION & COMPLETE IMPLEMENTATION PLAN

---

## 1. Executive Summary & Context

The Saloon platform codebase has successfully completed, verified, and frozen **Phases 1 through 26**:
- **Core Domain Services (`apps/api`):** 13 modular domains, NestJS 10, PostgreSQL (Prisma 5), Redis caching, S3/R2 cloud storage, with **253 test suites (1,761 unit & integration tests passing with 0 regressions)**.
- **Shared SDK Foundation (`packages/*`):** Canonical types, DTOs, utilities, and configuration (`@saloon/shared-types`, `@saloon/shared-utils`, `@saloon/config`) with **59 passing unit tests**.
- **Salon Owner & Staff Dashboard (`apps/salon-dashboard`):** Complete Next.js 14 App Router portal across 11 modules with **3 test suites (11 tests)**.
- **Customer Mobile App (`apps/customer-mobile`):** Complete React Native Expo SDK 51 application across 10 screens with **4 test suites (12 tests)**.
- **Super-Admin Platform Portal (`apps/admin-dashboard`):** Complete Next.js 14 App Router command center across 14 governance modules with **4 test suites (21 tests)** and **18/18 statically generated pages**.
- **Security Hardening (Phases 26.1–26.9):** Ingress rate limiting, RBAC, tenant isolation, IDOR protection, prototype pollution defense, database transaction integrity, secret redactions, supply-chain overrides, and adversarial penetration simulations **VERIFIED & FROZEN**.
- **Turborepo Build:** 10/10 packages building cleanly.

**Phase 27 Objective:** Establish full operational readiness, production observability, performance optimizations, database query efficiency, memory and resource scalability, and deployment reliability across the Godiva/Saloon monorepo.

---

## 2. Monorepo Topology & Observability Baseline

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   REPOSITORY TOPOLOGY AUDIT                                 │
├────────────────────────────────┬───────────────────────────┬────────────────────────────────┤
│ Target Workspace               │ Framework & Version       │ Current Verified Status        │
├────────────────────────────────┼───────────────────────────┼────────────────────────────────┤
│ `apps/api`                     │ NestJS 10, Express        │ 253/253 suites passed (1,761)  │
│ `apps/salon-dashboard`         │ Next.js 14.2 (App Router) │ 3/3 suites passed (11 tests)   │
│ `apps/customer-mobile`         │ React Native (Expo SDK 51)│ 4/4 suites passed (12 tests)   │
│ `apps/admin-dashboard`         │ Next.js 14.2 (App Router) │ 4/4 suites passed (21 tests)   │
│ `packages/database`            │ Prisma 5.14, PostgreSQL   │ 40+ models, 150+ indexes       │
│ `packages/shared-types`        │ TypeScript 5.4            │ Canonical DTOs, Enums, Types   │
│ `packages/shared-utils`        │ TypeScript 5.4, Jest      │ 7/7 suites passed (53 tests)   │
│ `packages/config`              │ TypeScript 5.4            │ 1/1 suite passed (3 tests)     │
└────────────────────────────────┴───────────────────────────┴────────────────────────────────┘
```

---

## 3. Phase 27 Sub-Phase Breakdown

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               PHASE 27 SUB-PHASE BREAKDOWN                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ Phase 27.1 — Production Observability, Logging, Monitoring & Operational Readiness          │
│ • Structured JSON Logging with Pino & sensitive data redaction                              │
│ • Request ID correlation & propagation across HTTP headers and log context                  │
│ • Global exception normalization & leak-free error envelopes                                │
│ • Health, Liveness, and Readiness probes for Kubernetes / container orchestration           │
│ • Graceful shutdown lifecycle hooks on Prisma and Redis connections                         │
│ • Production alerting & operational dashboard telemetry specifications                      │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ Phase 27.2 — Production Performance, Database Optimization & Scalability Hardening          │
│ • Comprehensive database index auditing across 40+ models (150+ verified indexes)           │
│ • Bounded pagination enforcement (MAX_LIMIT = 100) preventing memory exhaustion             │
│ • N+1 query elimination and parallel query resolution (Promise.all)                         │
│ • Direct-to-cloud presigned storage uploads bypassing API bandwidth                         │
│ • Optimistic Concurrency Control (OCC) version integrity & conflict resolution              │
│ • Chunked stream/batch processing for high-volume datasets                                  │
│ • Load testing readiness specifications & execution guidelines                              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ Phase 27.3 — Deployment Automation, Containerization & Production CI/CD Readiness           │
│ • Multi-stage Docker packaging for Node.js API with non-root security                       │
│ • Docker Compose production orchestration (PostgreSQL, Redis, API, BullMQ)                 │
│ • Environment configuration validation with startup fail-fast integrity                     │
│ • Disaster recovery, database migration safety & automated rollback guidelines              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Sub-Phase 27.1 — Production Observability & Monitoring Architecture

### 4.1 Structured Logging Model
Every production log emitted by `@saloon/api` follows a standardized JSON schema:
- `timestamp`: ISO-8601 UTC timestamp.
- `level`: `info`, `warn`, `error`, `debug`.
- `service`: `saloon-api`.
- `requestId`: Injected from `RequestIdMiddleware`.
- `method`, `url`, `statusCode`, `durationMs`: Populated by `LoggingInterceptor`.
- **Automatic Redaction:** Pino redacts `authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-razorpay-signature`, `password`, `refreshToken`, `token`, `otp`, `secret`, `apiKey`, and payment card numbers.

### 4.2 Request Correlation Flow
1. Client / Ingress sends optional `x-request-id`.
2. `RequestIdMiddleware` preserves valid incoming ID or generates standard UUIDv4.
3. Request ID attached to Express request headers and returned in response headers.
4. Embedded in all log lines, error envelopes, and audit log records.

### 4.3 Health & Probe Architecture
- `GET /api/v1/health`: Base health check.
- `GET /api/v1/health/readiness`: Verifies PostgreSQL (`SELECT 1`) and Redis (`PING`).
- `GET /api/v1/health/liveness`: Verifies process event loop responsiveness.
- All probes annotated with `@Public()` and `@SkipAllThrottlers()`.

### 4.4 Graceful Lifecycle Management
- `app.enableShutdownHooks()` enabled in `main.ts`.
- `PrismaService.onModuleDestroy()` cleanly calls `$disconnect()`.
- `RedisService.onModuleDestroy()` cleanly calls `client.quit()`.

---

## 5. Sub-Phase 27.2 — Database Performance & Scalability Architecture

### 5.1 Database Indexing Strategy
All high-volume query access patterns are backed by targeted B-Tree composite indexes:
- **Tenancy Lookups:** `idx_salons_owner`, `idx_branches_salon_primary`, `idx_staff_salon_role_status`.
- **Appointment Filtering:** `idx_bookings_salon_date`, `idx_bookings_branch_date_status`, `idx_bookings_customer_date`, `idx_bookings_status_date`.
- **Concurrency & Locking:** `idx_booking_reservation_locks_released_expires`, `idx_booking_reservation_locks_branch_staff`.
- **Inventory & Ledger:** `idx_inventory_stock_branch_product`, `idx_stock_movements_branch_date`.

### 5.2 Bounded Resource Allocation & Pagination
- Maximum pagination batch size strictly enforced at `MAX_LIMIT = 100` via `PaginationUtil`.
- Negative/invalid page numbers automatically normalized to `page: 1`, preventing database driver integer underflow.
- Payload body size capped at `1mb` via Express JSON middleware.

### 5.3 N+1 Prevention & Parallelization
- Entity relations fetched via single SQL joins using Prisma `include`.
- Independent queries (e.g. data fetching + total count calculation) resolved concurrently using `Promise.all([findMany(), count()])`.

### 5.4 Concurrency & Lock Latency Optimization
- Redis slot reservation locks (`setNX` with 300s TTL) prevent database row-level locking during user checkout.
- Database OCC version numbers (`version = version + 1`) guarantee atomic state transitions with `409 Conflict` on race conditions.

---

## 6. Sub-Phase 27.3 — Deployment, Containerization & Operations

### 6.1 Multi-Stage Dockerfile Architecture
```dockerfile
# Stage 1: Pruning
FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune @saloon/api --docker

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@saloon/api...

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodejs
USER nodejs
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

### 6.2 Production Alert Specifications
- **CRITICAL Alerts:** `ApiInstanceDown` (Liveness fail > 1m), `DatabaseConnectionFailure` (Readiness fail > 30s), `RedisUnavailable` (Readiness fail > 30s), `PaymentFailureSpike` (> 10% failures over 5m).
- **WARNING Alerts:** `HighHttp5xxRate` (> 2% over 5m), `ElevatedHttpLatency` (P95 > 2000ms), `HighRateLimit429Rate` (> 50 req/min), `QueueBacklogGrowing` (Waiting jobs > 500).

---

## 7. Verification & Regression Plan

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                VERIFICATION MATRIX & CRITERIA                               │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Production Observability Spec (`production-observability.spec.ts`)                       │
│    • Request ID generation and upstream preservation                                        │
│    • Structured HTTP request logging with duration and status code                          │
│    • GlobalExceptionFilter internal error suppression and credential sanitization           │
│    • PII email/phone masking in structured security events                                  │
│    • Health/Readiness/Liveness probe status representations                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. Production Performance Spec (`production-performance.spec.ts`)                           │
│    • Bounded pagination parameter normalization and MAX_LIMIT (100) clamping                │
│    • Parallel Promise.all query execution benchmarks                                        │
│    • Large dataset chunking and batch memory bounding                                       │
│    • Search query sanitization in O(N) time with control character stripping                │
│    • Optimistic concurrency control (OCC) version integrity verification                   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. Full Monorepo Regression Test & Build                                                    │
│    • pnpm test across all 7 workspace packages (253+ test suites, 1,760+ tests passing)     │
│    • pnpm turbo run build (10/10 packages building with 0 TypeScript/compilation errors)     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Rollout & Operational Checklist

- [x] Environment configuration validation schema in `config.validation.ts`
- [x] Pino logger redaction paths configured in `logger.module.ts`
- [x] RequestIdMiddleware attached globally
- [x] HealthController liveness and readiness probes active
- [x] PrismaService and RedisService graceful shutdown hooks registered
- [x] Bounded pagination util `PaginationUtil` active across all collections
- [x] OCC versioning implemented across stateful entities
- [x] Docker multi-stage build containerized with non-root user
- [x] All test suites passing with 100% success rate
