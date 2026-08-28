# PHASE 26 — ADVANCED PLATFORM OPERATIONS, BACKGROUND PROCESSING & PRODUCTION HARDENING
## ARCHITECTURAL SPECIFICATION & COMPLETE IMPLEMENTATION PLAN

---

## 1. Executive Summary & Context

The Saloon platform codebase has successfully completed, verified, and frozen **Phases 1 through 25**:
- **Backend API (`apps/api`):** 13 modular domains, NestJS 10, PostgreSQL (Prisma 5), Redis caching, S3/R2 cloud storage, with **245 test suites (1,678 unit & integration tests passing with 0 regressions)**.
- **Shared SDK Foundation (`packages/*`):** Canonical types, DTOs, utilities, and configuration (`@saloon/shared-types`, `@saloon/shared-utils`, `@saloon/config`) with **57 passing unit tests**.
- **Salon Owner & Staff Dashboard (`apps/salon-dashboard`):** Complete Next.js 14 App Router portal across 11 modules (Calendar, Branches, Staff, Services, Inventory, Customers, Promotions, Reviews, Media, Analytics, Settings).
- **Customer Mobile App (`apps/customer-mobile`):** Complete React Native Expo SDK 51 application across 10 screens (Discovery, Salon Detail, Booking Wizard, Appointments, Wallet, Loyalty, Profile, Reviews, Notifications).
- **Super-Admin Platform Portal (`apps/admin-dashboard`):** Complete Next.js 14 App Router command center across 14 governance modules, verified with **4 test suites (21 passing tests)** and **18/18 statically generated pages**.
- **Turborepo Build:** 7/7 packages building cleanly.

**Phase 26 Objective:** Transform the platform from a functional application suite into an enterprise-grade, self-healing, observable, and secured production platform by implementing automated BullMQ background queue workers, distributed Redis rate limiting, enterprise security headers, OpenTelemetry/Prometheus telemetry, and multi-stage containerization.

---

## 2. Repository Audit & Gap Analysis

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   REPOSITORY TOPOLOGY AUDIT                                 │
├────────────────────────────────┬───────────────────────────┬────────────────────────────────┤
│ Target Workspace               │ Framework & Version       │ Current Verified Status        │
├────────────────────────────────┼───────────────────────────┼────────────────────────────────┤
│ `apps/api`                     │ NestJS 10, Fastify/Express│ 245/245 suites passed (1,678)  │
│ `apps/salon-dashboard`         │ Next.js 14.2 (App Router) │ 11 functional modules complete │
│ `apps/customer-mobile`         │ React Native (Expo SDK 51)│ 10 customer screens complete   │
│ `apps/admin-dashboard`          │ Next.js 14.2 (App Router) │ 4 suites (21 tests), 18 routes │
│ `packages/database`            │ Prisma 5.14, PostgreSQL   │ 40+ models, multi-tenant DDL   │
│ `packages/shared-types`        │ TypeScript 5.4            │ Canonical DTOs, Enums, Types   │
│ `packages/shared-utils`        │ TypeScript 5.4, Jest      │ ApiClient, formatters, storage │
│ `packages/config`              │ TypeScript 5.4            │ 80+ API routes, platform limits│
└────────────────────────────────┴───────────────────────────┴────────────────────────────────┘
```

### Identified Operational Gaps in the Baseline:
1. **Background Queue Workers:** `apps/api/src/infrastructure/queue/processors/` currently contains only an `example.processor.ts`. Scheduled background jobs (automatic 10-min reservation lock cleanup, outbox event dispatching, SMS/WhatsApp/Push notification queue consumption, failed webhook retries) rely on manual triggers or in-memory execution rather than robust BullMQ workers.
2. **Security Headers & Distributed Rate Limiting:** `apps/api/src/main.ts` configures CORS and `ValidationPipe`, but lacks `helmet` security headers and distributed Redis-backed rate limiting (`ThrottlerModule` with `@nestjs/throttler-storage-redis`) on public authentication and booking endpoints.
3. **Production Observability & Metrics:** `apps/api/src/health/health.controller.ts` provides basic liveness/readiness probes, but lacks Prometheus metrics endpoint (`/api/v1/metrics`), OpenTelemetry distributed trace propagation, and queue latency telemetry.
4. **Infrastructure Packaging:** `infrastructure/docker/` and `infrastructure/deployment/` contain only `.gitkeep` files, lacking multi-stage Dockerfiles, `docker-compose.prod.yml`, and CI/CD pipelines.

---

## 3. Phase 26 Scope & Core Modules

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            PHASE 26 SCOPE & CORE MODULES                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. QUEUE WORKERS & SCHEDULED BACKGROUND PROCESSING (BullMQ + Redis)                         │
│    • LockReaperProcessor: Automated 60-second cron releasing expired 10-min booking locks   │
│    • OutboxDispatcherProcessor: Polls & publishes transactional domain events reliably      │
│    • NotificationQueueProcessors: Isolated workers for SMS, WhatsApp, Push & Email          │
│    • PaymentReconciliationProcessor: Queries Razorpay API for stale pending transactions    │
│    • CouponExpiryProcessor: Automatically archives depleted & expired promotional campaigns │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. INGRESS SECURITY & RATE LIMITING HARDENING                                               │
│    • Distributed Redis ThrottlerGuard with tier-based limits (OTP: 5/min, Search: 60/min)   │
│    • Helmet HTTP Security Headers (strict CSP, HSTS, Frameguard, NoSniff)                  │
│    • Redis-backed Token Blacklisting Hook for instant compromised session revocation        │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. ENTERPRISE OBSERVABILITY & TELEMETRY                                                     │
│    • Prometheus Metrics Collector & `/api/v1/metrics` exporter (`prom-client`)              │
│    • OpenTelemetry TraceContext propagation across HTTP headers and BullMQ job metadata     │
│    • Enhanced Deep Health Probes for Database Pool, Redis Latency, Storage & Queue Health   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. PRODUCTION CONTAINERIZATION & DEPLOYMENT PACKAGING                                       │
│    • Multi-stage Dockerfiles for `apps/api`, `apps/salon-dashboard`, `apps/admin-dashboard` │
│    • Production `docker-compose.prod.yml` with Redis, PostgreSQL, and NGINX Reverse Proxy   │
│    • Production deployment verification scripts & health validation harness                 │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Architecture & Dataflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             PHASE 26 ARCHITECTURE DATAFLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

  [ Client Requests ] (Mobile / Web / Admin)
          │
          ▼
  ┌───────────────────────────────────────────────────────────────────────────┐
  │                         NGINX Reverse Proxy                               │
  │               (SSL Termination, Gzip, Connection Pooling)                 │
  └─────────────────────────────────────┬─────────────────────────────────────┘
                                        │
                                        ▼
  ┌───────────────────────────────────────────────────────────────────────────┐
  │                           NestJS Ingress Layer                            │
  │    • Helmet Security Headers (CSP, HSTS, X-Content-Type-Options)          │
  │    • Redis-Backed ThrottlerGuard (Distributed Rate Limiting)              │
  │    • RequestIdMiddleware (Correlated x-request-id tracing)                │
  └─────────────────────────────────────┬─────────────────────────────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
  ┌─────────────────────────────┐               ┌─────────────────────────────┐
  │    Synchronous REST API     │               │   BullMQ Queue Processors   │
  │  • Auth / Salon / Booking   │               │  • LockReaperProcessor      │
  │  • Inventory / Payments     │               │  • OutboxDispatcherProcessor│
  │  • Prometheus /metrics      │               │  • Notification Processors  │
  └──────────────┬──────────────┘               │  • PaymentReconciler        │
                 │                              └──────────────┬──────────────┘
                 ▼                                             ▼
  ┌───────────────────────────────────────────────────────────────────────────┐
  │                 Shared Infrastructure (PostgreSQL & Redis)                │
  │    • PostgreSQL Database (Prisma ORM Connection Pool)                     │
  │    • Redis Cluster (Cache-Aside, Distributed Locks, BullMQ Queues)        │
  └───────────────────────────────────────────────────────────────────────────┘
```

---

## 5. File & Module Impact

### NEW FILES
1. **Background Processors:**
   - `apps/api/src/infrastructure/queue/processors/lock-reaper.processor.ts`
   - `apps/api/src/infrastructure/queue/processors/outbox-dispatcher.processor.ts`
   - `apps/api/src/infrastructure/queue/processors/notification-sms.processor.ts`
   - `apps/api/src/infrastructure/queue/processors/notification-push.processor.ts`
   - `apps/api/src/infrastructure/queue/processors/notification-whatsapp.processor.ts`
   - `apps/api/src/infrastructure/queue/processors/payment-reconciler.processor.ts`
2. **Metrics & Telemetry:**
   - `apps/api/src/infrastructure/metrics/metrics.module.ts`
   - `apps/api/src/infrastructure/metrics/metrics.service.ts`
   - `apps/api/src/infrastructure/metrics/metrics.controller.ts`
3. **Security Guards:**
   - `apps/api/src/common/guards/throttler.guard.ts`
4. **Test Specs:**
   - `apps/api/src/infrastructure/queue/processors/tests/lock-reaper.processor.spec.ts`
   - `apps/api/src/infrastructure/queue/processors/tests/outbox-dispatcher.processor.spec.ts`
   - `apps/api/src/infrastructure/queue/processors/tests/notification-processors.spec.ts`
   - `apps/api/src/infrastructure/queue/processors/tests/payment-reconciler.processor.spec.ts`
   - `apps/api/src/infrastructure/metrics/tests/metrics.service.spec.ts`
5. **Infrastructure Packaging:**
   - `infrastructure/docker/api.Dockerfile`
   - `infrastructure/docker/salon-dashboard.Dockerfile`
   - `infrastructure/docker/admin-dashboard.Dockerfile`
   - `infrastructure/docker-compose.prod.yml`
   - `infrastructure/nginx/nginx.conf`

### MODIFIED FILES (Additive & Controlled Only)
- `apps/api/src/main.ts` (Attach `helmet`, configure global rate limiting)
- `apps/api/src/app.module.ts` (Register `MetricsModule`, `ThrottlerModule.forRootAsync`)
- `apps/api/src/infrastructure/queue/queue.module.ts` (Register new processors)
- `packages/config/src/routes.config.ts` (Add `API_ROUTES.METRICS`)
- `packages/config/src/platform.config.ts` (Add rate limit constants)

### UNCHANGED / FROZEN BOUNDARIES
- **Phases 1–25 are strictly frozen.**
- All core business logic in domain controllers, services, repositories, and UI components remains untouched.

---

## 6. Database Impact

**"No database schema changes required."**

All database tables (`booking_locks`, `outbox_events`, `payments`, `coupons`, `notifications`, `audit_logs`) were previously created and indexed in Phases 1–21. Phase 26 connects the automated background workers and schedulers to these existing tables without modifying table schemas or DDL migrations.

---

## 7. API Contract Matrix

| Feature | Endpoint | Method | Request DTO | Response DTO | Auth / RBAC | Status |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **Prometheus Telemetry** | `/api/v1/metrics` | `GET` | — | Prometheus Plaintext (`text/plain`) | Public / Telemetry Scraper | **NEW** |
| **Detailed Queue Health** | `/api/v1/health/queues` | `GET` | — | `QueueHealthResponseDto` | `SUPER_ADMIN` | **NEW** |
| **Manual Lock Cleanup** | `/api/v1/admin/bookings/cleanup-expired-locks` | `POST` | `{}` | `{ cleanedCount: number }` | `SUPER_ADMIN` | **EXISTING (Automated)** |
| **Webhook Retry Trigger**| `/api/v1/admin/payments/webhooks/retry` | `POST` | `{ webhookLogId: string }` | `{ status: string }` | `SUPER_ADMIN` | **EXISTING (Automated)** |

---

## 8. Sub-Phase Implementation Plan

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             PHASE 26 SUB-PHASE BREAKDOWN                                    │
├─────────┬──────────────────────────────────────────┬────────────────────────────────────────┤
│ Sub-Ph  │ Name & Objective                         │ Key Deliverables                       │
├─────────┼──────────────────────────────────────────┼────────────────────────────────────────┤
│ **26.1**│ Ingress Security & Distributed Throttler │ Helmet headers, Redis ThrottlerGuard   │
│ **26.2**│ Automated Booking Lock Reaper Worker     │ BullMQ 60s cron worker for slot locks  │
│ **26.3**│ Transactional Outbox Dispatcher Worker   │ Outbox poller & domain event publisher │
│ **26.4**│ Resilient Notification Queue Processors  │ SMS, WhatsApp, Push & Email workers    │
│ **26.5**│ Payment Reconciliation & Webhook Worker  │ Stale payment auto-settlement worker   │
│ **26.6**│ Observability, Prometheus & Health Probes│ `/metrics` exporter & queue probes     │
│ **26.7**│ Multi-Stage Docker & Compose Packaging   │ Production Dockerfiles & NGINX config  │
│ **26.8**│ Operational Verification Test Suite      │ Queue, rate limit, and security tests  │
│ **26.9**│ Monorepo Regression & Production Freeze  │ 245+ backend tests green, Turbo build  │
└─────────┴──────────────────────────────────────────┴────────────────────────────────────────┘
```

---

## 9. Testing & Verification Strategy

1. **Unit Tests (`apps/api`):**
   - `lock-reaper.processor.spec.ts`: Validates releasing expired locks while preserving active locks.
   - `outbox-dispatcher.processor.spec.ts`: Validates publishing events and marking status `PROCESSED`.
   - `notification-queues.processor.spec.ts`: Validates retry backoff on third-party provider failures.
   - `payment-reconciler.processor.spec.ts`: Validates updating abandoned payments to `EXPIRED`.
2. **Security & Integration Tests:**
   - `rate-limiting.spec.ts`: Simulates 10 rapid requests to `/auth/otp/send` and asserts HTTP 429 Too Many Requests.
   - `security-headers.spec.ts`: Inspects response headers for `X-Content-Type-Options`, `HSTS`, `CSP`.
3. **Monorepo Regression Test:**
   - Run `pnpm --filter @saloon/api test` (must maintain **≥245 test suites, ≥1,678 tests passed**).
   - Run `pnpm --filter @saloon/admin-dashboard test` (must maintain **4/4 suites, 21 tests passed**).
   - Run `pnpm turbo run build` (must pass **7/7 packages** cleanly).

---

## 10. Production Definition of Done

- [ ] `helmet` security headers active and verified on all HTTP responses.
- [ ] Redis distributed rate limiting active on `/auth/otp/*` and `/booking/lock`.
- [ ] 4 BullMQ queue processors active, tested, and self-healing.
- [ ] Automated booking lock reaper releases expired locks every 60 seconds.
- [ ] Prometheus metrics endpoint `/api/v1/metrics` active and secured for telemetry scrapers.
- [ ] Multi-stage Dockerfiles build clean, lightweight production containers.
- [ ] 100% passing backend tests (≥245 suites, ≥1,678 tests) with zero regressions.
- [ ] Full monorepo production build (`pnpm turbo run build`) passes across all 7 packages.
- [ ] Zero placeholder numbers, mock code, or unresolved TODOs in Phase 26 scope.

---

## 11. Exact Implementation Order

```
1. Ingress Security & Rate Limiting (Sub-phase 26.1)
   └── Configure helmet headers and Redis ThrottlerGuard in main.ts and app.module.ts.

2. Background Queue Processors (Sub-phases 26.2 – 26.5)
   └── Implement LockReaperProcessor (60s cron).
   └── Implement OutboxDispatcherProcessor (domain events).
   └── Implement NotificationQueueProcessors (SMS, Push, WhatsApp).
   └── Implement PaymentReconciliationProcessor (stale payments).

3. Telemetry & Metrics (Sub-phase 26.6)
   └── Implement Prometheus MetricsModule and queue health probe.

4. Production Docker Packaging (Sub-phase 26.7)
   └── Build multi-stage Dockerfiles and docker-compose.prod.yml.

5. Verification & Monorepo Freeze (Sub-phases 26.8 – 26.9)
   └── Run full test suites, typechecks, and turbo build.
   └── Update walkthrough.md and freeze Phase 26.
```

---

PHASE 26 ARCHITECTURAL SPECIFICATION & IMPLEMENTATION PLAN DOCUMENTED.

AWAITING EXPLICIT AUTHORIZATION TO BEGIN IMPLEMENTATION.
