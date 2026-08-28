# Phase 5: Backend Architecture Specification

## Salon Booking & Management Platform

**Version:** 5.1 (Repository Layer · Swagger · Transaction Rules · Production Hardening)  
**Date:** 2026-08-05  
**Author:** Principal Backend Architect (Antigravity)  
**Status:** Awaiting Approval  
**Locked Source of Truth:** PRD v1.2 · Architecture v2.1 · Logical DB v3.1 · Physical DB v4.3

---

## Document Map

| Section | Topic |
|---|---|
| §1 | Backend Folder Structure |
| §2 | Module Architecture |
| §3 | Shared Infrastructure Services |
| §4 | Configuration System |
| §5 | Authentication Foundation |
| §6 | Authorization Foundation (RBAC) |
| §7 | Validation Strategy |
| §8 | Exception Handling |
| §9 | Logging |
| §10 | Queue Architecture (BullMQ) |
| §11 | Caching Strategy (Redis) |
| §12 | Event Architecture |
| §13 | API Standards |
| §14 | Coding Standards |
| §15 | Backend Readiness Checklist |
| §16 | API Documentation (Swagger / OpenAPI) |
| §17 | Transaction Rules |
| §18 | Production Hardening (Health · Rate Limiting · Feature Flags · Idempotency) |

---

## §1 · Complete Backend Folder Structure

The backend lives inside the Turborepo workspace at `apps/api`. Below is the full production directory tree with a purpose description for every folder.

```
apps/api/
├── src/
│   │
│   ├── main.ts                         # Application bootstrap (NestFactory, global pipes, filters)
│   ├── app.module.ts                   # Root module — imports all feature modules
│   ├── app.controller.ts               # Health check endpoint (/health, /readiness)
│   │
│   ├── config/                         # Configuration layer
│   │   ├── app.config.ts               # Core app config (port, prefix, cors)
│   │   ├── database.config.ts          # PostgreSQL / Prisma connection settings
│   │   ├── redis.config.ts             # Redis connection settings
│   │   ├── jwt.config.ts               # JWT secret, expiry settings
│   │   ├── bullmq.config.ts            # BullMQ connection and default job options
│   │   ├── cloudinary.config.ts        # Cloudinary API credentials
│   │   ├── razorpay.config.ts          # Razorpay key_id and key_secret
│   │   ├── firebase.config.ts          # FCM service account / project ID
│   │   ├── twilio.config.ts            # Twilio / SMS provider credentials
│   │   └── config.validation.ts        # Joi schema to validate all env vars at boot
│   │
│   ├── common/                         # Cross-cutting concerns shared across ALL modules
│   │   ├── constants/                  # Application-level constants
│   │   │   ├── roles.constant.ts       # UserRole enum mirror for guards
│   │   │   ├── queues.constant.ts      # Queue name strings (NOTIFICATION_QUEUE, etc.)
│   │   │   ├── cache-keys.constant.ts  # Redis key prefix templates
│   │   │   ├── events.constant.ts      # Domain event name strings
│   │   │   └── pagination.constant.ts  # Default page size, max page size
│   │   │
│   │   ├── decorators/                 # Custom parameter and class decorators
│   │   │   ├── current-user.decorator.ts   # @CurrentUser() — extracts authenticated user from request
│   │   │   ├── roles.decorator.ts          # @Roles(...roles) — attaches role metadata to handlers
│   │   │   ├── public.decorator.ts         # @Public() — marks route as unauthenticated
│   │   │   ├── api-paginated-response.decorator.ts  # Swagger pagination wrapper
│   │   │   └── serialize.decorator.ts      # @Serialize(Dto) — response class transform hint
│   │   │
│   │   ├── guards/                     # Auth and authorization guards
│   │   │   ├── jwt-auth.guard.ts       # Global default guard (validates Bearer token)
│   │   │   ├── roles.guard.ts          # Reads @Roles() metadata; enforces RBAC
│   │   │   └── refresh-token.guard.ts  # Validates refresh token cookie/header
│   │   │
│   │   ├── interceptors/               # Request/response pipeline interceptors
│   │   │   ├── transform.interceptor.ts    # Wraps all responses in { success, data, meta } envelope
│   │   │   ├── logging.interceptor.ts      # Logs request method, path, duration
│   │   │   ├── cache.interceptor.ts        # Reads @CacheKey / @CacheTTL and serves from Redis
│   │   │   └── audit.interceptor.ts        # Writes AuditLog rows for mutating operations
│   │   │
│   │   ├── filters/                    # Global and domain-specific exception filters
│   │   │   ├── global-exception.filter.ts      # Catches everything; normalizes error envelope
│   │   │   ├── prisma-exception.filter.ts      # Maps Prisma error codes to HTTP responses
│   │   │   ├── validation-exception.filter.ts  # Formats class-validator errors
│   │   │   └── domain-exception.filter.ts      # Handles custom DomainException subclasses
│   │   │
│   │   ├── pipes/                      # Transformation and validation pipes
│   │   │   ├── validation.pipe.ts      # Global ValidationPipe configuration
│   │   │   ├── parse-uuid.pipe.ts      # Parses and validates UUID path params
│   │   │   └── trim-strings.pipe.ts    # Strips leading/trailing whitespace from string fields
│   │   │
│   │   ├── middleware/                 # HTTP middleware (runs before guards)
│   │   │   ├── request-id.middleware.ts    # Attaches unique X-Request-ID to every request
│   │   │   ├── correlation-id.middleware.ts # Propagates trace ID across service boundaries
│   │   │   └── rate-limit.middleware.ts     # Per-IP, per-route throttle (OTP: 5/min, etc.)
│   │   │
│   │   ├── exceptions/                 # Domain exception hierarchy
│   │   │   ├── domain.exception.ts         # Base DomainException extends HttpException
│   │   │   ├── not-found.exception.ts      # NotFoundException for missing domain entities
│   │   │   ├── conflict.exception.ts       # ConflictException (e.g. booking slot taken)
│   │   │   ├── forbidden.exception.ts      # ForbiddenException (e.g. not the salon owner)
│   │   │   ├── business-rule.exception.ts  # BusinessRuleException (e.g. outside booking hours)
│   │   │   └── external-api.exception.ts   # ExternalApiException (Razorpay / Firebase failures)
│   │   │
│   │   ├── dto/                        # Shared DTO building blocks
│   │   │   ├── pagination.dto.ts       # PaginationQueryDto (page, limit, sortBy, sortOrder)
│   │   │   ├── paginated-response.dto.ts  # PaginatedResponseDto<T> generic wrapper
│   │   │   └── id-param.dto.ts         # IdParamDto with @IsUUID validation
│   │   │
│   │   └── types/                      # TypeScript utility types and interfaces
│   │       ├── request.types.ts        # AuthenticatedRequest extending Express Request
│   │       ├── response-envelope.types.ts  # ApiResponse<T>, ApiError shape
│   │       └── paginated.types.ts      # PaginatedResult<T> internal type
│   │
│   ├── infrastructure/                 # Third-party service integrations and adapters
│   │   ├── database/
│   │   │   ├── database.module.ts      # Exports PrismaService globally
│   │   │   └── prisma.service.ts       # PrismaClient singleton with connect/disconnect lifecycle
│   │   │
│   │   ├── cache/
│   │   │   ├── cache.module.ts         # Exports RedisService globally via CacheModule
│   │   │   └── redis.service.ts        # Wraps ioredis: get, set, del, expire, keys, mget
│   │   │
│   │   ├── queue/
│   │   │   ├── queue.module.ts         # Registers all BullMQ queues globally
│   │   │   ├── queue.service.ts        # Typed job-dispatch facade across all queues
│   │   │   └── processors/             # BullMQ worker processor classes (one per queue)
│   │   │
│   │   ├── storage/
│   │   │   ├── storage.module.ts       # Exports CloudinaryService
│   │   │   └── cloudinary.service.ts   # upload(), delete(), generateSignedUrl()
│   │   │
│   │   ├── payments/
│   │   │   ├── payments.module.ts      # Exports RazorpayService
│   │   │   └── razorpay.service.ts     # createOrder(), verifySignature(), createRefund()
│   │   │
│   │   ├── notifications/
│   │   │   ├── notifications.module.ts  # Exports FcmService, SmsService, WhatsappService
│   │   │   ├── fcm.service.ts           # Firebase Cloud Messaging push delivery
│   │   │   ├── sms.service.ts           # SMS adapter (Twilio / AWS SNS)
│   │   │   └── whatsapp.service.ts      # WhatsApp adapter (Twilio / WATI)
│   │   │
│   │   └── logger/
│   │       ├── logger.module.ts         # Exports LoggerService globally
│   │       └── logger.service.ts        # Pino-based structured logger wrapper
│   │
│   ├── domains/                         # Core feature modules (business domains)
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── refresh-token.strategy.ts
│   │   │   ├── repositories/
│   │   │   │   └── session.repository.ts   # UserSession DB operations
│   │   │   └── dto/
│   │   │
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── repositories/
│   │   │   │   └── users.repository.ts
│   │   │   └── dto/
│   │   │
│   │   ├── salon/
│   │   │   ├── salon.module.ts
│   │   │   ├── repositories/
│   │   │   │   └── salon.repository.ts
│   │   │   └── dto/
│   │   │
│   │   ├── branch/
│   │   │   ├── branch.module.ts
│   │   │   ├── repositories/
│   │   │   │   ├── branch.repository.ts
│   │   │   │   └── branch-hours.repository.ts
│   │   │   └── dto/
│   │   │
│   │   ├── staff/
│   │   │   ├── staff.module.ts
│   │   │   ├── repositories/
│   │   │   │   ├── staff.repository.ts
│   │   │   │   ├── staff-assignment.repository.ts
│   │   │   │   └── staff-availability.repository.ts
│   │   │   └── dto/
│   │   │
│   │   ├── services/
│   │   │   ├── services.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── booking/
│   │   │   ├── booking.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── payment/
│   │   │   ├── payment.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── notification/
│   │   │   ├── notification.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── media/
│   │   │   ├── media.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── search/
│   │   │   ├── search.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── review/
│   │   │   ├── review.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── coupon/
│   │   │   ├── coupon.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── admin/
│   │   │   ├── admin.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── dashboard/
│   │   │   ├── dashboard.module.ts
│   │   │   └── dto/
│   │   │
│   │   └── platform-settings/
│   │       ├── platform-settings.module.ts
│   │       └── dto/
│   │
│   └── events/                          # Domain event definitions and handlers
│       ├── event-emitter.module.ts      # Configures @nestjs/event-emitter globally
│       └── handlers/                   # @OnEvent() listeners organized by domain
│
├── test/
│   ├── unit/                           # Jest unit tests mirroring src/ structure
│   └── integration/                    # Integration tests using test DB
│
├── .env                                # Local development secrets (git-ignored)
├── .env.example                        # Template with all required variable names
├── .env.test                           # Test environment overrides
├── Dockerfile                          # Multi-stage production Docker image
├── .dockerignore
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
└── package.json
```

---

## §2 · Module Architecture

Every domain lives in `src/domains/<name>/`. Each module is self-contained: it owns its own Controller, Service, and DTOs. Modules expose Services and import only what they need.

---

### 2.1 Auth Module (`domains/auth`)

**Responsibility:** OTP login flow, JWT issuance, refresh token rotation, logout, session management.

**Dependencies:** `UsersModule`, `infrastructure/database`, `infrastructure/cache`, `infrastructure/notifications`

**Public Services:** `AuthService` — exported and consumable by other modules that need to verify identity.

**Exposed API surface (design only, no implementation):**

| Method | Path | Description |
|---|---|---|
| POST | `/auth/otp/request` | Send OTP to phone number |
| POST | `/auth/otp/verify` | Verify OTP; issue access + refresh tokens |
| POST | `/auth/token/refresh` | Exchange valid refresh token for new pair |
| POST | `/auth/logout` | Revoke current session |

---

### 2.2 Users Module (`domains/users`)

**Responsibility:** Customer profile CRUD, avatar upload, account settings, device token registration (for FCM push).

**Dependencies:** `infrastructure/database`, `infrastructure/storage`

**Public Services:** `UsersService` — used by `AuthModule` to look up and create users during OTP flow.

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| GET | `/users/me` | Get own profile |
| PATCH | `/users/me` | Update own profile |
| POST | `/users/me/avatar` | Upload profile picture |
| POST | `/users/me/device-token` | Register FCM device token |

---

### 2.3 Salon Module (`domains/salon`)

**Responsibility:** Salon registration, status lifecycle (DRAFT → PENDING → APPROVED), plan management (Free vs Premium), salon profile.

**Dependencies:** `infrastructure/database`, `infrastructure/storage`, `infrastructure/cache`

**Public Services:** `SalonService` — used by `BranchModule` and `AdminModule`.

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| POST | `/salons` | Register a new salon |
| GET | `/salons/me` | Salon owner: get own salon |
| PATCH | `/salons/me` | Salon owner: update salon profile |
| GET | `/salons/:id` | Public: get salon detail |

---

### 2.4 Branch Module (`domains/branch`)

**Responsibility:** Branch CRUD, business hours, special holidays, temporary closures, branch manager assignment.

**Dependencies:** `SalonModule`, `StaffModule`, `infrastructure/database`, `infrastructure/cache`

**Public Services:** `BranchService` — used by `BookingModule` and `SearchModule`.

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| POST | `/salons/me/branches` | Add a branch |
| GET | `/salons/me/branches` | List all branches of own salon |
| PATCH | `/salons/me/branches/:id` | Update branch |
| PUT | `/salons/me/branches/:id/hours` | Set business hours |
| POST | `/salons/me/branches/:id/holidays` | Add special holiday |
| POST | `/salons/me/branches/:id/closures` | Add temporary closure |
| GET | `/branches/:id` | Public: get branch detail |

---

### 2.5 Staff Module (`domains/staff`)

**Responsibility:** Staff profile CRUD, branch assignments (with history), shifts, breaks, leaves, manual blocks, staff-service skill linkage.

**Dependencies:** `BranchModule`, `infrastructure/database`

**Public Services:** `StaffService`, `StaffAvailabilityService` — used by `BookingModule` for slot calculation.

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| POST | `/salons/me/staff` | Invite / create a staff member |
| GET | `/salons/me/staff` | List all staff |
| PATCH | `/salons/me/staff/:id` | Update staff profile |
| POST | `/salons/me/staff/:id/assignments` | Assign staff to a branch |
| PUT | `/salons/me/staff/:id/shifts` | Set weekly shift schedule |
| POST | `/salons/me/staff/:id/leaves` | Log a leave |
| POST | `/salons/me/staff/:id/blocks` | Add a manual block |
| GET | `/staff/:id/schedule` | Get staff availability (for booking UI) |

---

### 2.6 Services Module (`domains/services`)

**Responsibility:** Master service catalogue (read-only platform-managed), branch-level service activation with custom price and duration, staff-service skill mapping.

**Dependencies:** `BranchModule`, `StaffModule`, `infrastructure/database`, `infrastructure/cache`

**Public Services:** `BranchServicesService` — used by `BookingModule`.

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| GET | `/services/categories` | List master categories |
| GET | `/services` | List all master services |
| POST | `/branches/:branchId/services` | Activate a service for this branch |
| PATCH | `/branches/:branchId/services/:id` | Update price / duration |
| DELETE | `/branches/:branchId/services/:id` | Deactivate service |
| PUT | `/branches/:branchId/services/:id/staff` | Assign staff skills for this service |

---

### 2.7 Booking Module (`domains/booking`)

**Responsibility:** Core booking lifecycle — slot checking, appointment creation, status transitions (PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED), cancellation, no-show, appointment status log, booking number generation.

> [!IMPORTANT]
> This is the most complex domain module. It depends on almost every other module but must remain loosely coupled via services — it never imports another module's internal components.

**Dependencies:** `BranchModule`, `StaffModule`, `ServicesModule`, `CouponModule`, `infrastructure/database`, `infrastructure/queue`, `infrastructure/cache`

**Public Services:** `BookingService` — emits `AppointmentCreated`, `AppointmentCancelled`, `AppointmentCompleted` domain events.

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| GET | `/branches/:branchId/slots` | Get available time slots |
| POST | `/appointments` | Create booking |
| GET | `/appointments` | Customer: list own appointments |
| GET | `/appointments/:id` | Get appointment detail |
| PATCH | `/appointments/:id/cancel` | Cancel appointment |
| GET | `/branches/:branchId/appointments` | Staff/owner: branch appointment list |
| PATCH | `/appointments/:id/status` | Staff: advance status (check-in, complete, etc.) |

---

### 2.8 Payment Module (`domains/payment`)

**Responsibility:** Razorpay order creation, payment verification (signature), payment failure handling, pay-at-salon recording, refunds, payout ledger writes.

**Dependencies:** `BookingModule`, `infrastructure/payments`, `infrastructure/database`, `infrastructure/queue`

**Public Services:** `PaymentService` — emits `PaymentCompleted`, `RefundInitiated` domain events.

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| POST | `/payments/orders` | Create Razorpay order for an appointment |
| POST | `/payments/verify` | Verify signature and record payment |
| POST | `/payments/cash` | Record pay-at-salon cash payment |
| POST | `/payments/:id/refund` | Initiate refund |
| GET | `/payments/:id` | Get payment detail |

---

### 2.9 Notification Module (`domains/notification`)

**Responsibility:** Notification record creation, template management, in-app notification inbox, read-status tracking. The actual delivery is handled by BullMQ workers calling infrastructure services.

**Dependencies:** `infrastructure/database`, `infrastructure/queue`

**Public Services:** `NotificationService` — used by other modules to dispatch notifications. All other modules call `NotificationService.dispatch()` and never touch infrastructure directly.

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | Get own notification inbox |
| PATCH | `/notifications/:id/read` | Mark as read |
| GET | `/notifications/templates` | Admin: list templates |
| PATCH | `/notifications/templates/:id` | Admin: update template |

---

### 2.10 Media Module (`domains/media`)

**Responsibility:** Signed upload URL generation, Cloudinary webhook callback processing, media record CRUD, access URL generation.

**Dependencies:** `infrastructure/storage`, `infrastructure/database`

**Public Services:** `MediaService` — used by UsersModule, SalonModule, BranchModule.

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| POST | `/media/upload` | Upload file (multipart) |
| GET | `/media/:id` | Get media metadata |
| DELETE | `/media/:id` | Delete media (owner or admin only) |

---

### 2.11 Search Module (`domains/search`)

**Responsibility:** Geo-proximity salon/branch search, fuzzy text search, search history recording (authenticated and anonymous), trending search computation.

**Dependencies:** `BranchModule`, `ServicesModule`, `infrastructure/database`, `infrastructure/cache`

**Public Services:** None exported (purely consumer-facing).

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| GET | `/search/salons` | Geo + text search for salons |
| GET | `/search/trending` | Get trending search keywords |
| GET | `/search/history` | Customer: own search history |

---

### 2.12 Review Module (`domains/review`)

**Responsibility:** Customer review submission post-appointment, review reply by salon owner, fetch reviews for a branch.

**Dependencies:** `BookingModule`, `infrastructure/database`

**Public Services:** `ReviewService` — emits `ReviewSubmitted` domain event.

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| POST | `/appointments/:id/review` | Submit a review |
| GET | `/branches/:branchId/reviews` | List reviews for a branch |
| POST | `/reviews/:id/reply` | Owner: reply to review |

---

### 2.13 Coupon Module (`domains/coupon`)

**Responsibility:** Coupon validation during checkout (code lookup, expiry, usage limit, minimum order amount), coupon usage recording. Admin CRUD for coupons.

**Dependencies:** `infrastructure/database`, `infrastructure/cache`

**Public Services:** `CouponService.validate(code, amount)` — used by `BookingModule`.

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| POST | `/coupons/validate` | Validate coupon code for order |
| GET | `/admin/coupons` | Admin: list all coupons |
| POST | `/admin/coupons` | Admin: create coupon |
| PATCH | `/admin/coupons/:id` | Admin: update coupon |

---

### 2.14 Admin Module (`domains/admin`)

**Responsibility:** Super Admin operations — salon approval/rejection/suspension, support agent management, platform-wide reporting triggers, user lookup.

**Dependencies:** `SalonModule`, `UsersModule`, `BookingModule`, `infrastructure/database`

**Public Services:** `AdminService` — emits `SalonApproved`, `SalonSuspended` domain events.

**Exposed API surface (all routes under `/admin`):**

| Method | Path | Description |
|---|---|---|
| GET | `/admin/salons` | List all salons with filters |
| PATCH | `/admin/salons/:id/approve` | Approve salon |
| PATCH | `/admin/salons/:id/reject` | Reject salon |
| PATCH | `/admin/salons/:id/suspend` | Suspend salon |
| GET | `/admin/users` | Search users |
| GET | `/admin/audit-logs` | Audit log viewer |

---

### 2.15 Dashboard Module (`domains/dashboard`)

**Responsibility:** Aggregated reporting for salon owners and staff. Daily / weekly / monthly revenue, appointment counts, top services. Reads from pre-aggregated cache or direct DB queries (no heavy analytics).

**Dependencies:** `BookingModule`, `PaymentModule`, `infrastructure/database`, `infrastructure/cache`

**Public Services:** None exported.

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard/overview` | Owner/staff: today snapshot |
| GET | `/dashboard/revenue` | Revenue by period (day/week/month) |
| GET | `/dashboard/appointments` | Appointment stats |
| GET | `/dashboard/staff-performance` | Per-staff appointment counts |

---

### 2.16 Platform Settings Module (`domains/platform-settings`)

**Responsibility:** Read and update the singleton `PlatformSettings` row. Commission %, default tax rate, booking buffer minutes, etc. Cached in Redis; invalidated on update.

**Dependencies:** `infrastructure/database`, `infrastructure/cache`

**Public Services:** `PlatformSettingsService.get()` — consumed by `PaymentModule` and `BookingModule` to read live config values.

**Exposed API surface:**

| Method | Path | Description |
|---|---|---|
| GET | `/platform-settings` | Admin: get current settings |
| PATCH | `/platform-settings` | Admin: update settings |

---

## §3 · Shared Infrastructure Services

All infrastructure services live in `src/infrastructure/` and are provided through their own NestJS modules with `global: true`. Domain modules import these as needed via their module import list, not directly via constructor injection of infrastructure classes.

---

### 3.1 PrismaService

**Ownership:** `infrastructure/database/prisma.service.ts`  
**Provided by:** `DatabaseModule` (global)

Design contract:
- Extends `PrismaClient` with NestJS `OnModuleInit` and `OnModuleDestroy`.
- Calls `$connect()` on init and `$disconnect()` on destroy.
- Exposes soft-delete middleware that automatically appends `AND deleted_at IS NULL` to all `findMany` and `findFirst` queries on entities with `deletedAt`.
- Exposes query logging middleware in development mode that pipes Prisma query events to `LoggerService`.
- **Rule:** All domain services receive `PrismaService` via constructor injection. No raw `new PrismaClient()` is ever permitted outside this service.

---

### 3.2 RedisService

**Ownership:** `infrastructure/cache/redis.service.ts`  
**Provided by:** `CacheModule` (global)

Design contract:
- Wraps `ioredis` client.
- Exposes typed helper methods: `get<T>()`, `set<T>()`, `del()`, `expire()`, `keys()`, `mget()`, `incr()`, `setNX()`.
- All keys are namespaced using constants from `common/constants/cache-keys.constant.ts` (e.g., `salon:{id}:profile`, `platform:settings`).
- **Rule:** No domain service calls `ioredis` directly. All Redis operations flow through `RedisService`.

---

### 3.3 QueueService

**Ownership:** `infrastructure/queue/queue.service.ts`  
**Provided by:** `QueueModule` (global)

Design contract:
- Wraps `@nestjs/bullmq` queue injection.
- Exposes a typed dispatch method: `dispatch(queue: QueueName, job: JobPayload, opts?: JobOptions)`.
- Each BullMQ queue is registered in `QueueModule` using the `QUEUE_*` constants from `common/constants/queues.constant.ts`.
- **Rule:** Domain services call `QueueService.dispatch()` only. They never inject a `Queue` class directly.

---

### 3.4 CloudinaryService

**Ownership:** `infrastructure/storage/cloudinary.service.ts`  
**Provided by:** `StorageModule` (global)

Design contract:
- Exposes `upload(file: Buffer, folder: string): Promise<CloudinaryUploadResult>`.
- Exposes `delete(publicId: string): Promise<void>`.
- Exposes `generateSignedUrl(publicId: string, expiresInSeconds: number): string`.
- Returns a `CloudinaryUploadResult` containing `url`, `thumbnailUrl`, `publicId`, `mimeType`, `fileSize`.
- **Rule:** `MediaModule` is the only domain module that directly imports `StorageModule`. All other modules use `MediaService` to perform file operations.

---

### 3.5 RazorpayService

**Ownership:** `infrastructure/payments/razorpay.service.ts`  
**Provided by:** `PaymentsModule` (global)

Design contract:
- Exposes `createOrder(amount: number, currency: string, receiptId: string): Promise<RazorpayOrder>`.
- Exposes `verifySignature(orderId: string, paymentId: string, signature: string): boolean`.
- Exposes `createRefund(paymentId: string, amount: number): Promise<RazorpayRefund>`.
- All Razorpay amounts are in **paise** (integer). Conversion to/from INR is done inside `PaymentService`, never in `RazorpayService`.
- Throws `ExternalApiException` on Razorpay SDK errors.
- **Rule:** Only `PaymentModule` imports `PaymentsModule`.

---

### 3.6 Infrastructure Notification Services

**Ownership:** `infrastructure/notifications/`  
**Provided by:** `NotificationsModule` (global)

Three adapters:
1. **FcmService** — Firebase Admin SDK `messaging().send()`. Accepts `FcmPayload { token, title, body, data }`.
2. **SmsService** — Twilio `messages.create()`. Accepts `SmsPayload { to, body }`. Falls back to AWS SNS if Twilio fails.
3. **WhatsappService** — WhatsApp Business API. Accepts template name and variable substitution map.

**Rule:** These three services are only called by BullMQ notification worker processors inside `infrastructure/queue/processors/`. Domain code calls `NotificationService.dispatch()` only; it never talks to FcmService/SmsService directly.

---

### 3.7 LoggerService

**Ownership:** `infrastructure/logger/logger.service.ts`  
**Provided by:** `LoggerModule` (global)

Design contract:
- Wraps `pino` logger. (Justification in §9.)
- Exposes: `log()`, `error()`, `warn()`, `debug()`, `audit()`.
- Auto-injects `requestId`, `correlationId`, and `userId` from the async local storage context set by middleware.
- **Rule:** No `console.log` or `console.error` is ever used. All code uses injected `LoggerService`.

---

### 3.8 Repository Layer

**Location:** `src/domains/<module>/repositories/`  
**Pattern:** One repository class per aggregate root (e.g. `AppointmentRepository`, `SalonRepository`).

**Why a Repository Layer?**

The original three-layer architecture — Controller → Service → Prisma — is sufficient for small projects. For a platform of this scale (multi-tenant, multi-branch, complex queries) we introduce an explicit repository layer:

```
Controller
    ↓
Service          ← owns business logic and rules
    ↓
Repository       ← owns all DB query construction
    ↓
PrismaService    ← owns the database connection
```

**Key Benefits:**

1. **ORM Isolation:** If `Prisma` is ever replaced by `Drizzle`, `TypeORM`, or a raw query builder, only the repository implementations change. Services and controllers remain identical.
2. **Query Responsibility:** Complex multi-join queries (e.g. booking slot availability) belong in repositories, not services. Services orchestrate; repositories query.
3. **Testability:** Repositories are a thin, mockable boundary. Unit-testing a service requires only a mock repository — no database.
4. **Reuse:** Multiple services in the same module can share a repository without duplicating query logic.

**Repository Design Contract:**

- Every repository receives `PrismaService` via constructor injection.
- Repositories expose strongly-typed methods with explicit return types (never raw Prisma model objects).
- Repositories handle `select` and `include` clauses — services never write Prisma query objects directly.
- Repository methods throw `NotFoundException` (from `common/exceptions/`) when expected records are not found.
- Repositories participate in Prisma transactions by accepting an optional `tx: PrismaTransactionClient` parameter — see §17 for full transaction rules.

**Naming Convention:**

| File | Class |
|---|---|
| `appointment.repository.ts` | `AppointmentRepository` |
| `staff-assignment.repository.ts` | `StaffAssignmentRepository` |
| `branch-hours.repository.ts` | `BranchHoursRepository` |

---

## §4 · Configuration System

### 4.1 Environment Variables

All required environment variables are declared in `.env.example`. They are loaded via `@nestjs/config` using `ConfigModule.forRoot()`.

**Variable Groups:**

```
# Application
NODE_ENV=development|test|production
APP_PORT=3000
APP_PREFIX=api
APP_CORS_ORIGINS=http://localhost:3001,https://app.saloon.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/saloon_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRES_IN=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Razorpay
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# Firebase
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# SMS / Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...

# BullMQ / Redis Queue (can reuse Redis or separate instance)
QUEUE_REDIS_HOST=localhost
QUEUE_REDIS_PORT=6379

# Platform
DEFAULT_COMMISSION_PERCENTAGE=10
```

### 4.2 Config Validation

At application bootstrap, a **Joi validation schema** in `config/config.validation.ts` validates every required variable. If any variable is missing or malformed, the process exits immediately with a clear error message before accepting any connections.

Validation rules include:
- `NODE_ENV`: must be one of `development`, `test`, `production`.
- `DATABASE_URL`: must start with `postgresql://`.
- `JWT_ACCESS_EXPIRES_IN`: must be a valid duration string.
- `APP_PORT`: must be a valid port number (1024–65535).

### 4.3 ConfigModule Design

```
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: configValidationSchema,    // Joi schema
  load: [
    appConfig,
    databaseConfig,
    jwtConfig,
    redisConfig,
    bullmqConfig,
    cloudinaryConfig,
    razorpayConfig,
    firebaseConfig,
    twilioConfig,
  ],
  envFilePath: getEnvFilePath(process.env.NODE_ENV),
})
```

`getEnvFilePath()` returns:
- `development` → `.env`
- `test` → `.env.test`
- `production` → environment variables are injected by Docker / cloud provider; no `.env` file is loaded.

### 4.4 Environment Separation

| Environment | Database | Redis | Queues | External APIs |
|---|---|---|---|---|
| Development | Local PostgreSQL | Local Redis | Local BullMQ | Sandbox keys |
| Test | Separate test DB (isolated) | In-memory or test Redis | Disabled or mocked | Fully mocked |
| Production | Managed PostgreSQL (RDS / Neon) | Managed Redis (Upstash) | Production BullMQ | Live keys |

---

## §5 · Authentication Foundation

**Design only. No code. No implementation.**

### 5.1 Login Flow (OTP)

```
Customer enters phone number
        ↓
POST /auth/otp/request
        ↓
AuthService: Check if User exists (create if first time)
        ↓
Generate 6-digit OTP
        ↓
Store OTP in Redis: key = otp:{phone}, value = hash(OTP), TTL = 5 min
        ↓
Dispatch OTP via SMS queue (BullMQ)
        ↓
POST /auth/otp/verify (phone + OTP)
        ↓
AuthService: Retrieve hash from Redis, compare
        ↓
If first login OR long gap since last token → issue new Access Token + Refresh Token
If valid session already exists → issue new tokens anyway (rotate)
        ↓
Refresh Token → store hashed in UserSession table (device-specific)
Access Token → returned in response body
Refresh Token → returned in HttpOnly secure cookie
```

### 5.2 Token Strategy

| Token | Type | Storage | Expiry | Rotation |
|---|---|---|---|---|
| Access Token | JWT (RS256 or HS256) | Response body | 15 minutes | On every refresh |
| Refresh Token | Opaque UUID | HttpOnly secure cookie + hashed in UserSession | 30 days | Rotated on use |

**OTP re-prompt policy:**
- First login → OTP always.
- Subsequent logins within the same device session → Refresh token used silently.
- Refresh token expired / revoked → OTP re-prompted.
- `UserSession.expiresAt` is checked server-side; expired sessions are rejected even with a valid refresh token signature.

### 5.3 Refresh Token Rotation

```
Client sends refresh token (HttpOnly cookie)
        ↓
RefreshTokenGuard validates it
        ↓
AuthService: Look up UserSession by refresh token hash
        ↓
Verify not expired, not revoked
        ↓
Generate new Access Token + new Refresh Token
        ↓
Update UserSession with new refresh token hash + new expiresAt
        ↓
Return new Access Token in body; set new Refresh Token in HttpOnly cookie
```

### 5.4 Logout Flow

```
POST /auth/logout
        ↓
AuthService: Delete UserSession row for this device
        ↓
Clear HttpOnly cookie
        ↓
Access Token is not revoked (short TTL handles it; no token blocklist in MVP)
```

### 5.5 JWT Strategy

- **Algorithm:** HS256 (MVP). RS256 recommended for multi-service future.
- **Payload:** `{ sub: userId, role: UserRole, sessionId: string, iat, exp }`.
- `JwtStrategy` validates every protected route by default via the global `JwtAuthGuard`.
- Routes marked with `@Public()` decorator bypass `JwtAuthGuard`.

### 5.6 Password Hashing

Staff / Admin accounts that have password login: Argon2id hashing (preferred over bcrypt for resistance to GPU brute-forcing). Customer-facing login is OTP only — no passwords stored.

---

## §6 · Authorization Foundation (RBAC)

### 6.1 Role Definitions

| Role | Who | Access Scope |
|---|---|---|
| `CUSTOMER` | App user who books | Own profile, own appointments, public search |
| `SALON_OWNER` | Registered salon owner | Own salon, all branches, all staff under their salon |
| `SALON_STAFF` | Stylist / receptionist | Assigned branch schedule, own profile |
| `SUPER_ADMIN` | Platform operator | Everything |
| `SUPPORT_AGENT` | Customer support | Read-only access to users/appointments; can trigger refunds |

### 6.2 Guard Architecture

Two guards are always active together:

1. **`JwtAuthGuard`** (global default) — validates the Bearer token and populates `request.user`. Routes decorated with `@Public()` are skipped.
2. **`RolesGuard`** — reads the `@Roles()` metadata from the route handler. If no `@Roles()` decorator is present, the guard passes (authentication alone is sufficient). If `@Roles()` is present, it checks `request.user.role` is in the allowed list.

### 6.3 Ownership Authorization

Role checks alone are insufficient for resource ownership (e.g. "can this salon owner modify this branch?"). Ownership is enforced **inside the service layer**, not in guards.

Pattern:
```
Service receives authenticated userId from @CurrentUser()
Service queries DB: WHERE id = :branchId AND salon.ownerId = :userId
If not found → throw ForbiddenException
```

This is simpler and more accurate than route-level guards for hierarchical ownership.

### 6.4 Permission Reference Table

| Action | CUSTOMER | SALON_OWNER | SALON_STAFF | SUPER_ADMIN | SUPPORT_AGENT |
|---|---|---|---|---|---|
| Search salons | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create booking | ✓ | — | — | ✓ | — |
| View own appointments | ✓ | — | — | ✓ | ✓ |
| Manage own salon | — | ✓ | — | ✓ | — |
| Manage staff | — | ✓ | — | ✓ | — |
| View branch schedule | — | ✓ | ✓ | ✓ | ✓ |
| Mark appointment complete | — | ✓ | ✓ | ✓ | — |
| Approve salons | — | — | — | ✓ | — |
| Update platform settings | — | — | — | ✓ | — |

---

## §7 · Validation Strategy

### 7.1 Global ValidationPipe

Configured once in `main.ts`:

```
ValidationPipe({
  whitelist: true,          // Strip unknown properties — never trust unknown input
  forbidNonWhitelisted: true, // Throw if unknown properties are present (strict mode)
  transform: true,          // Auto-transform payloads to DTO class instances
  transformOptions: {
    enableImplicitConversion: true,  // Query params arrive as strings; convert to number/boolean
  },
  exceptionFactory: (errors) => new ValidationException(errors),  // Custom error shape
})
```

### 7.2 DTO Validation

Every incoming request body, query, and param is a typed DTO class with `class-validator` decorators. No raw `req.body` access.

- **Create DTOs** (`CreateXxxDto`): all required fields, strict constraints.
- **Update DTOs** (`UpdateXxxDto`): all fields optional using `PartialType(CreateXxxDto)`.
- **Query DTOs** (`XxxQueryDto`): extends `PaginationQueryDto`.
- **Param DTOs** (`XxxParamDto`): UUID validation via `@IsUUID()`.

### 7.3 Response Serialization

- All responses use `class-transformer` `@Exclude()` / `@Expose()` decorators to prevent leaking sensitive fields (e.g. `passwordHash`, `refreshTokenHash`).
- The `TransformInterceptor` (global) wraps every successful response in:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

- Paginated responses include a `pagination` object inside `meta`:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 450,
      "totalPages": 23
    }
  }
}
```

### 7.4 Input Sanitization

The `TrimStringsPipe` (applied globally) trims all string values before validation runs. SQL injection is handled by Prisma's parameterized queries. XSS sanitization is handled by the API being a pure JSON REST API (no HTML rendering).

---

## §8 · Exception Handling

### 8.1 Exception Hierarchy

```
Error
└── HttpException (NestJS built-in)
    └── DomainException                   # Base for all business exceptions
        ├── NotFoundException             # 404 - Entity not found
        ├── ConflictException             # 409 - e.g. slot already booked
        ├── ForbiddenException            # 403 - ownership violation
        ├── BusinessRuleException         # 422 - rule violated (e.g. outside hours)
        └── ExternalApiException          # 502 - Razorpay/Firebase failed
ValidationException                       # 400 - class-validator errors
PrismaClientKnownRequestError             # Mapped by PrismaExceptionFilter
```

### 8.2 Global Exception Filter

The `GlobalExceptionFilter` catches all exceptions and normalizes them into:

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_SLOT_UNAVAILABLE",
    "message": "The selected time slot is no longer available.",
    "details": [],
    "requestId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

- `DomainException` subclasses carry a machine-readable `code` field for frontend handling.
- Validation errors carry a `details` array with per-field errors.
- Unexpected errors (`500`) log the full stack trace via `LoggerService.error()` but return only a generic message to the client.

### 8.3 Prisma Exception Mapping

`PrismaExceptionFilter` maps Prisma error codes to HTTP responses:

| Prisma Code | HTTP Status | Meaning |
|---|---|---|
| `P2002` | 409 Conflict | Unique constraint violation |
| `P2025` | 404 Not Found | Record to update/delete not found |
| `P2003` | 409 Conflict | Foreign key constraint violation |
| `P2014` | 400 Bad Request | Relation violation |

---

## §9 · Logging

**Chosen library: `pino`** (via `nestjs-pino`)

**Justification:**
- 5–10× faster than Winston in benchmarks due to async serialization.
- Structured JSON logs out of the box — compatible with Loki, Datadog, CloudWatch.
- `pino-pretty` for human-readable local development output.
- Built-in `child()` logger for request-scoped context (requestId, userId).
- First-class NestJS integration via `nestjs-pino`.

### 9.1 Log Levels by Environment

| Environment | Level |
|---|---|
| Development | `debug` |
| Test | `warn` |
| Production | `info` |

### 9.2 Logging Layers

**Request Logging** (via `LoggingInterceptor`):  
Every request logs: `{ method, path, statusCode, durationMs, userId, requestId }` at `info` level on completion.

**Error Logging** (via `GlobalExceptionFilter`):  
- Domain exceptions: `warn` level with `{ code, message, path, userId }`.
- Unexpected errors: `error` level with full stack trace.

**Audit Logging** (via `AuditInterceptor` + `AuditLog` DB table):  
Mutating operations (`POST`, `PATCH`, `PUT`, `DELETE`) on protected resources write an `AuditLog` row: `{ whoId, role, action, entityType, entityId, oldValueJson, newValueJson, ipAddress }`.

**Performance Logging**:  
Requests exceeding 2000ms are logged at `warn` level with the full path and duration. Prisma slow queries (>500ms) are logged by the Prisma query middleware.

### 9.3 Log Correlation

`RequestIdMiddleware` generates a UUID per request and stores it in `AsyncLocalStorage`. All log calls within that request automatically include `requestId` without being passed explicitly.

---

## §10 · Queue Architecture (BullMQ)

### 10.1 Queue Registry

| Queue Name (constant) | Purpose |
|---|---|
| `QUEUE_NOTIFICATION_PUSH` | Firebase FCM push notification dispatch |
| `QUEUE_NOTIFICATION_SMS` | SMS dispatch (OTP, booking confirmations) |
| `QUEUE_NOTIFICATION_WHATSAPP` | WhatsApp message dispatch |
| `QUEUE_NOTIFICATION_EMAIL` | Email dispatch (invoices, receipts) |
| `QUEUE_MEDIA_PROCESSING` | Image resize, thumbnail generation post-upload |
| `QUEUE_CLEANUP_JOBS` | Scheduled cleanup: expired sessions, stale OTPs, abandoned bookings |

### 10.2 Worker Processor Location

All BullMQ worker processor classes live in `src/infrastructure/queue/processors/`:

```
processors/
├── push-notification.processor.ts
├── sms-notification.processor.ts
├── whatsapp-notification.processor.ts
├── email-notification.processor.ts
├── media-processing.processor.ts
└── cleanup.processor.ts
```

Processors inject infrastructure services only (`FcmService`, `SmsService`, etc.) — never domain services.

### 10.3 Job Payload Contracts

Every queue job has a strongly typed payload interface defined in `common/types/`:

```typescript
interface SmsJobPayload {
  to: string;        // E.164 format phone number
  body: string;      // Message text
  templateCode?: string;
}

interface PushJobPayload {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}
```

### 10.4 Retry Strategy

| Queue | Max Attempts | Backoff Strategy | On Failure |
|---|---|---|---|
| `QUEUE_NOTIFICATION_SMS` | 5 | Exponential (2s, 4s, 8s, 16s, 32s) | Mark `NotificationDelivery.status = FAILED`, log reason |
| `QUEUE_NOTIFICATION_PUSH` | 3 | Fixed 5s | Mark failed, increment `retryCount` |
| `QUEUE_NOTIFICATION_WHATSAPP` | 3 | Exponential | Mark failed |
| `QUEUE_NOTIFICATION_EMAIL` | 5 | Exponential | Mark failed |
| `QUEUE_MEDIA_PROCESSING` | 3 | Fixed 10s | Log error; media remains unprocessed |
| `QUEUE_CLEANUP_JOBS` | 1 | None | Log warning; retry on next scheduled run |

### 10.5 Scheduled (Cron) Jobs

BullMQ `repeat` jobs handle recurring cleanup tasks:

| Job | Schedule | Action |
|---|---|---|
| `cleanup.expired-sessions` | Every hour | Delete `UserSession` rows where `expiresAt < NOW()` |
| `cleanup.stale-otp` | Every 10 min | Delete Redis OTP keys past TTL (defensive cleanup) |
| `cleanup.abandoned-bookings` | Every 30 min | Cancel `PENDING` appointments older than 30 minutes with no payment |

---

## §11 · Caching Strategy (Redis)

### 11.1 Cache Key Namespace Convention

All cache keys follow a strict namespace format to prevent collisions:

```
{entity}:{identifier}:{variant}
```

Examples:
```
salon:{salonId}:profile           → Salon detail (15 min TTL)
branch:{branchId}:profile         → Branch detail (15 min TTL)
branch:{branchId}:services        → Active services list for branch (10 min TTL)
branch:{branchId}:hours           → Business hours (60 min TTL; changes rarely)
platform:settings                 → PlatformSettings singleton (30 min TTL)
search:geo:{lat}:{lng}:{radius}   → Geo search results (5 min TTL)
search:trending:{city}            → Trending keywords (30 min TTL)
```

### 11.2 Cache Invalidation Rules

| Trigger | Keys Invalidated |
|---|---|
| Salon profile updated | `salon:{id}:profile` |
| Branch updated | `branch:{id}:profile`, `branch:{id}:hours`, `branch:{id}:services` |
| Branch service added/updated/removed | `branch:{id}:services` |
| Platform settings updated | `platform:settings` |
| New appointment created/cancelled | `search:geo:*` (pattern delete using Redis SCAN) |

> [!NOTE]
> Pattern-based deletion (`SCAN + DEL`) is used sparingly and only for geo search keys where no specific key can be targeted. All other invalidations are by exact key.

### 11.3 Cache Read-Through Pattern

All service methods that benefit from caching follow this pattern:

```
1. Attempt cache read with RedisService.get(cacheKey)
2. If HIT → return deserialized value
3. If MISS → query DB → serialize → write to Redis with TTL → return value
```

Cache is written on miss only. There is no background pre-warming in MVP (added in Phase 2 as traffic grows).

### 11.4 Cache Bypass

Admin and owner-facing writes always bypass the cache read (they hit the DB directly) and always invalidate the relevant cache keys after writing.

---

## §12 · Event Architecture

### 12.1 Event System

Internal domain events use `@nestjs/event-emitter` (in-process, synchronous-by-default). This avoids the complexity of an external event bus for MVP while providing clean module decoupling.

All event names are defined in `common/constants/events.constant.ts` as string constants.

### 12.2 Domain Event Catalogue

| Event Name | Emitted By | Consumed By | Purpose |
|---|---|---|---|
| `appointment.created` | `BookingService` | `NotificationService` | Send booking confirmation to customer + salon |
| `appointment.confirmed` | `BookingService` | `NotificationService` | Send confirmation notification |
| `appointment.cancelled` | `BookingService` | `NotificationService`, `PaymentService` | Send cancellation notice; trigger refund if paid |
| `appointment.completed` | `BookingService` | `NotificationService`, `ReviewService` | Send review request to customer |
| `appointment.no_show` | `BookingService` | `NotificationService` | Log and notify salon |
| `payment.completed` | `PaymentService` | `NotificationService`, `BookingService` | Confirm booking after payment; send receipt |
| `payment.failed` | `PaymentService` | `NotificationService` | Notify customer of failure |
| `payment.refunded` | `PaymentService` | `NotificationService` | Notify customer of refund |
| `review.submitted` | `ReviewService` | `NotificationService` | Notify salon owner of new review |
| `salon.approved` | `AdminService` | `NotificationService` | Notify salon owner their application is approved |
| `salon.rejected` | `AdminService` | `NotificationService` | Notify salon owner with rejection reason |
| `salon.suspended` | `AdminService` | `NotificationService`, `BookingService` | Cancel pending appointments; notify owner |

### 12.3 Event Handler Location

All `@OnEvent()` handler methods live in the consuming module's own folder, not in the emitting module. This preserves the directional dependency arrow.

Example: `AppointmentCreatedHandler` lives in `NotificationModule`, not `BookingModule`.

---

## §13 · API Standards

### 13.1 URL Conventions

- All paths are `kebab-case`.
- All paths are prefixed with `/api/v1/`.
- Resource names are **plural nouns**.
- Sub-resources are nested where they express ownership (max 2 levels deep).
- Actions that don't fit CRUD use verb suffixes.

```
✓ /api/v1/appointments
✓ /api/v1/salons/me/branches
✓ /api/v1/appointments/:id/cancel     ← action verb as suffix
✗ /api/v1/getAppointment              ← never use verbs in base paths
✗ /api/v1/salon/branch/1/staffMember  ← too deep, use camelCase
```

### 13.2 HTTP Status Codes

| Scenario | Code |
|---|---|
| Successful read | 200 OK |
| Successful create | 201 Created |
| Successful update / action | 200 OK |
| Successful delete | 204 No Content |
| Validation error | 400 Bad Request |
| Unauthenticated | 401 Unauthorized |
| Forbidden (wrong role/ownership) | 403 Forbidden |
| Resource not found | 404 Not Found |
| Conflict (duplicate, slot taken) | 409 Conflict |
| Business rule violation | 422 Unprocessable Entity |
| External API failure | 502 Bad Gateway |
| Server error | 500 Internal Server Error |

### 13.3 Pagination

All list endpoints accept:
```
?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

- `page` default: `1` (minimum: `1`)
- `limit` default: `20` (maximum: `100`)
- `sortBy` default: `createdAt`
- `sortOrder`: `asc` or `desc`

### 13.4 Filtering

Resource-specific filters are appended as query parameters using the exact field name from the DTO:

```
/api/v1/appointments?status=CONFIRMED&date=2026-08-05
/api/v1/salons?city=Bangalore&genderCategory=UNISEX
```

All filter parameters are declared explicitly in the Query DTO — no dynamic filter building.

### 13.5 API Versioning

Strategy: **URL path versioning** (`/api/v1/`).  
NestJS `enableVersioning()` with `VersioningType.URI`.  
All controllers declare `@Controller({ version: '1', path: 'resource' })`.

Version `v2` will be created only when breaking changes are required. `v1` and `v2` coexist during deprecation windows.

---

## §14 · Coding Standards

### 14.1 Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Files | `kebab-case` | `booking.service.ts` |
| Classes | `PascalCase` | `BookingService` |
| Interfaces | `PascalCase` with `I` prefix (optional, team preference) | `IBookingService` |
| Constants | `SCREAMING_SNAKE_CASE` | `QUEUE_NOTIFICATION_SMS` |
| Enums | `PascalCase` values | `AppointmentStatus.CONFIRMED` |
| Variables / params | `camelCase` | `staffAssignmentId` |
| DTOs | `<Action><Resource>Dto` | `CreateBookingDto`, `UpdateBranchDto` |
| Controllers | `<Resource>Controller` | `BookingController` |
| Services | `<Resource>Service` | `BookingService` |
| Guards | `<Name>Guard` | `JwtAuthGuard`, `RolesGuard` |
| Interceptors | `<Name>Interceptor` | `TransformInterceptor` |
| Filters | `<Name>Filter` | `GlobalExceptionFilter` |
| Pipes | `<Name>Pipe` | `ParseUuidPipe` |
| Events | `<entity>.<action>` (string const) | `appointment.created` |

### 14.2 Module Internal Structure

Every domain module folder follows this consistent layout with the repository layer included:

```
domains/<module>/
├── <module>.module.ts          # @Module() declaration
├── <module>.controller.ts      # Route handlers; delegates to service (thin)
├── <module>.service.ts         # Business logic; calls repositories (not PrismaService directly)
├── repositories/
│   └── <module>.repository.ts  # All Prisma queries for this domain
├── dto/
│   ├── create-<module>.dto.ts
│   ├── update-<module>.dto.ts
│   └── <module>-query.dto.ts
└── types/
    └── <module>.types.ts       # Internal types / return shapes
```

### 14.3 Service Layer Rules

- Services contain all business logic. Controllers are thin: they validate, call one service method, and return.
- Services call **repositories** — never `PrismaService` directly.
- Services never return raw Prisma models to controllers. They map to a typed response shape or plain object.
- Services communicate with other modules only via **injected services** (no direct DB calls into another module's table).
- Services emit events (via `EventEmitter2.emit()`) as the **last step after a committed transaction** — never mid-transaction. (See §17 for full transaction rules.)

### 14.4 Import Organization

Imports are organized in this order with a blank line between each group:

```typescript
// 1. Node built-ins (if any)
import { randomUUID } from 'crypto';

// 2. Third-party / NestJS / Prisma
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';

// 3. Internal infrastructure
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

// 4. Internal common (guards, decorators, exceptions)
import { ConflictException } from '../../common/exceptions/conflict.exception';
import { CACHE_KEYS } from '../../common/constants/cache-keys.constant';

// 5. Local (same module)
import { CreateBookingDto } from './dto/create-booking.dto';
```

### 14.5 Prisma Query Rules

- All Prisma queries are written inside **repository methods** — never directly in services or controllers.
- Always use Prisma's typed query builders. No raw SQL via `$queryRaw` except for: PostGIS spatial queries, materialized view reads, and bulk operations where Prisma's batch API is insufficient.
- `$transaction()` is used for all multi-table write operations; see §17 for full transaction rules.
- `select` and `include` are always explicit in every repository method — never return all fields by default.

---

## §15 · Backend Readiness Checklist

| Area | Item | Status |
|---|---|---|
| **Structure** | Complete folder structure defined | ✅ |
| **Structure** | Every folder has a single clear responsibility | ✅ |
| **Modules** | 16 domain modules with boundaries defined | ✅ |
| **Modules** | Module dependency directions documented | ✅ |
| **Modules** | No circular module dependencies | ✅ |
| **Infrastructure** | PrismaService designed with soft-delete middleware | ✅ |
| **Infrastructure** | RedisService designed with namespaced keys | ✅ |
| **Infrastructure** | QueueService designed with typed dispatch | ✅ |
| **Infrastructure** | CloudinaryService designed with upload/delete/signed-url | ✅ |
| **Infrastructure** | RazorpayService designed with create/verify/refund | ✅ |
| **Infrastructure** | FCM, SMS, WhatsApp adapters designed | ✅ |
| **Infrastructure** | LoggerService (Pino) designed | ✅ |
| **Repository** | Repository layer designed (Controller → Service → Repository → Prisma) | ✅ |
| **Repository** | Repository contracts defined (typed methods, no raw Prisma in services) | ✅ |
| **Repository** | Repository tx parameter pattern defined | ✅ |
| **Auth** | OTP login flow documented step by step | ✅ |
| **Auth** | JWT access + refresh token strategy documented | ✅ |
| **Auth** | Refresh token rotation designed | ✅ |
| **Auth** | Logout and session revocation designed | ✅ |
| **Authorization** | 5 roles with permission table | ✅ |
| **Authorization** | Guard architecture (JwtAuthGuard + RolesGuard) | ✅ |
| **Authorization** | Ownership enforcement pattern defined | ✅ |
| **Config** | All environment variables catalogued | ✅ |
| **Config** | Joi validation schema at bootstrap | ✅ |
| **Config** | Environment separation (dev/test/prod) | ✅ |
| **Validation** | Global ValidationPipe configured | ✅ |
| **Validation** | DTO naming convention defined | ✅ |
| **Validation** | Response serialization envelope defined | ✅ |
| **Exceptions** | Exception hierarchy designed | ✅ |
| **Exceptions** | GlobalExceptionFilter with standard error envelope | ✅ |
| **Exceptions** | Prisma error code mapping | ✅ |
| **Logging** | Pino selected and justified | ✅ |
| **Logging** | Request / error / audit / performance logging designed | ✅ |
| **Logging** | Request correlation via AsyncLocalStorage | ✅ |
| **Queues** | 6 BullMQ queues defined | ✅ |
| **Queues** | Retry strategy per queue | ✅ |
| **Queues** | Scheduled cleanup jobs defined | ✅ |
| **Cache** | Redis namespace convention defined | ✅ |
| **Cache** | TTLs defined for each cache type | ✅ |
| **Cache** | Invalidation rules per write operation | ✅ |
| **Events** | 12 domain events catalogued | ✅ |
| **Events** | Producer ↔ consumer mapping documented | ✅ |
| **API** | URL convention defined | ✅ |
| **API** | HTTP status code mapping | ✅ |
| **API** | Pagination, filtering, sorting standard | ✅ |
| **API** | API versioning strategy defined | ✅ |
| **API Docs** | Swagger / OpenAPI setup designed | ✅ |
| **API Docs** | Bearer auth, response models, error models documented | ✅ |
| **Transactions** | Transaction boundary rules defined | ✅ |
| **Transactions** | Event-after-commit rule enforced in design | ✅ |
| **Health** | /health, /readiness, /liveness endpoints designed | ✅ |
| **Rate Limiting** | Per-route throttle limits designed | ✅ |
| **Feature Flags** | Feature flags via PlatformSettings designed | ✅ |
| **Idempotency** | Idempotency-Key header pattern designed | ✅ |
| **Coding** | Naming conventions for all artifact types | ✅ |
| **Coding** | Module internal layout standard (with repository layer) | ✅ |
| **Coding** | Import organization order | ✅ |
| **Coding** | Service layer rules defined | ✅ |
| **Coding** | Prisma query rules defined (in repositories only) | ✅ |

---

## §16 · API Documentation (Swagger / OpenAPI)

### 16.1 Setup

`@nestjs/swagger` is configured in `main.ts` alongside the global pipes and filters. Swagger UI is served at `/api/docs` in `development` and `staging` environments only. It is **disabled in production** by default (enabled via feature flag if required for internal teams).

### 16.2 OpenAPI Document Configuration

```
SwaggerModule.createDocument(app, {
  title: 'Saloon Platform API',
  description: 'REST API for Salon Booking & Management Platform',
  version: '1.0',
  tags: [
    { name: 'Auth', description: 'OTP login, token management' },
    { name: 'Users', description: 'Customer profiles' },
    { name: 'Salons', description: 'Salon registration and management' },
    { name: 'Branches', description: 'Branch and operating hours management' },
    { name: 'Staff', description: 'Staff profiles, shifts, availability' },
    { name: 'Services', description: 'Service catalogue and branch services' },
    { name: 'Booking', description: 'Appointment lifecycle' },
    { name: 'Payments', description: 'Razorpay payment and invoices' },
    { name: 'Notifications', description: 'Inbox and template management' },
    { name: 'Media', description: 'File upload and management' },
    { name: 'Search', description: 'Geo and text search' },
    { name: 'Reviews', description: 'Customer reviews and replies' },
    { name: 'Coupons', description: 'Coupon validation and management' },
    { name: 'Admin', description: 'Super Admin operations' },
    { name: 'Dashboard', description: 'Revenue and appointment analytics' },
    { name: 'Platform Settings', description: 'Platform configuration' },
    { name: 'Health', description: 'Health and readiness probes' },
  ],
})
```

### 16.3 Bearer Authentication

All protected routes are annotated at the controller level with:
```
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
```

The Swagger UI includes a global "Authorize" button that accepts the JWT access token, enabling interactive API exploration directly from the docs.

### 16.4 Decorator Standards

Every controller method must have:

| Decorator | Purpose |
|---|---|
| `@ApiOperation({ summary: '...' })` | Short description of what the endpoint does |
| `@ApiResponse({ status: 200, type: XxxResponseDto })` | Successful response model |
| `@ApiResponse({ status: 400, type: ErrorResponseDto })` | Validation error |
| `@ApiResponse({ status: 401, type: ErrorResponseDto })` | Unauthenticated |
| `@ApiResponse({ status: 403, type: ErrorResponseDto })` | Forbidden |
| `@ApiResponse({ status: 404, type: ErrorResponseDto })` | Not found |
| `@ApiTags('TagName')` | Groups the endpoint in the correct section |

### 16.5 Response and Error Models

All response DTOs decorated with `@ApiProperty()` on every field. Two shared error models are defined in `common/dto/`:

**`ErrorResponseDto`** — used for all non-2xx responses:
```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": [],
    "requestId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

**`PaginatedResponseDto<T>`** — used for all list responses (generic, documented with `@ApiExtraModels`).

### 16.6 Examples

Complex request bodies include `@ApiBody({ examples: { ... } })` with realistic example data matching the Indian market context (Indian phone numbers, INR amounts, Indian cities).

---

## §17 · Transaction Rules

### 17.1 The Core Rule

> [!CAUTION]
> **Events MUST NEVER be emitted before the database transaction commits.**
>
> This is the most common production mistake in event-driven architectures.
> If a transaction rolls back after an event is emitted, external systems (notification queue, payment service) will have acted on data that no longer exists.

### 17.2 Correct Transaction → Event Pattern

```
Service.createBooking()
        ↓
    PrismaService.$transaction(async (tx) => {
        ↓
        AppointmentRepository.create(tx)          ← pass tx to repository
        ↓
        AppointmentItemRepository.createMany(tx)  ← same transaction
        ↓
        AppointmentStatusLogRepository.create(tx) ← same transaction
        ↓
        SlotReservationRepository.reserve(tx)     ← same transaction
    })                                            ← transaction COMMITS here
        ↓
    EventEmitter2.emit('appointment.created', ...) ← ONLY AFTER commit
```

### 17.3 Transaction Boundary Definitions

The following operations MUST execute inside a single `$transaction()` call:

| Operation | Tables Written in Same Transaction |
|---|---|
| **Create Appointment** | `appointments`, `appointment_items`, `appointment_status_logs` |
| **Cancel Appointment** | `appointments` (status), `appointment_status_logs` |
| **Verify Payment** | `payments`, `invoices`, `appointments` (status), `salon_payout_ledgers` |
| **Refund Payment** | `payments` (new refund row), `invoices` (status to VOIDED) |
| **Approve Salon** | `salons` (status), `audit_logs` |
| **Suspend Salon** | `salons` (status), `appointments` (cancel all pending), `audit_logs` |
| **Apply Coupon on Booking** | `appointments`, `coupon_usages`, `coupons` (increment usage_count) |

### 17.4 Repository Transaction Parameter

All repository methods that participate in transactions accept an **optional** `tx` parameter:

```typescript
// Repository method signature pattern
async create(
  data: CreateAppointmentInput,
  tx?: PrismaTransactionClient,   // Optional; defaults to this.prisma if omitted
): Promise<AppointmentRecord>
```

This means the same repository method works both standalone (non-transactional reads) and inside a transaction (writes), without duplicating code.

### 17.5 What Does NOT Need a Transaction

- Read-only operations (`findMany`, `findFirst`) — never transactional.
- Single-table atomic writes (e.g. updating a user's name) — Prisma single-row writes are atomic by default.
- Cache writes — Redis writes happen after the DB transaction commits; they are not transactional.
- Queue jobs — dispatched only after the transaction commits.

### 17.6 Error Handling in Transactions

- If any repository call throws inside a `$transaction()` block, Prisma automatically rolls back all changes.
- The service catches the rollback, maps it to the appropriate domain exception (`ConflictException`, `BusinessRuleException`), and returns the error to the controller.
- No partial state is ever persisted.

---

## §18 · Production Hardening

### 18.1 Health Module

**Location:** `src/health/`  
**Library:** `@nestjs/terminus`

Three endpoints are exposed, all **public** (no authentication required):

| Endpoint | Purpose | Checks Performed |
|---|---|---|
| `GET /health` | Full health overview | DB connectivity, Redis connectivity |
| `GET /health/readiness` | Kubernetes readiness probe | DB + Redis + BullMQ queue reachable |
| `GET /health/liveness` | Kubernetes liveness probe | Process alive (no DB check; avoids cascading restart) |

**Response shape (healthy):**
```json
{ "status": "ok", "info": { "database": { "status": "up" }, "redis": { "status": "up" } } }
```

**Response shape (unhealthy):** HTTP 503 with failing component details.

**Why separate readiness and liveness?**  
`/readiness` failing removes the pod from the load balancer (traffic stops). `/liveness` failing restarts the pod. Mixing them causes restart loops when the database is temporarily unreachable — a common production incident.

---

### 18.2 Rate Limiting

**Library:** `@nestjs/throttler` with Redis store (`throttler-storage-redis`) for distributed rate limiting across multiple API instances.

Rate limits are enforced per IP address by default. Authenticated endpoints apply limits per `userId` to prevent one account from being unfairly throttled.

| Route / Group | Limit | Window | Rationale |
|---|---|---|---|
| `POST /auth/otp/request` | **5 requests** | 1 minute | OTP SMS cost control; prevents SMS bombing |
| `POST /auth/otp/verify` | **10 requests** | 1 minute | Brute-force OTP protection |
| `POST /auth/token/refresh` | **20 requests** | 1 minute | Token refresh loop prevention |
| `POST /appointments` | **20 requests** | 1 minute | Prevents booking spam |
| `POST /payments/*` | **10 requests** | 1 minute | Payment gateway protection |
| `GET /search/salons` | **100 requests** | 1 minute | Search is read-heavy; allow higher frequency |
| Admin routes (`/admin/*`) | **200 requests** | 1 minute | Admin users need higher limits |
| Default (all other routes) | **60 requests** | 1 minute | General API protection |

On limit exceeded: HTTP `429 Too Many Requests` with a `Retry-After` header indicating when the window resets.

---

### 18.3 Feature Flags

Feature flags are stored as boolean fields directly in the `PlatformSettings` singleton row. This avoids a separate feature flag service in MVP while providing the ability to toggle features at runtime (after a cache invalidation).

**Fields added to `PlatformSettings` (logical design — no schema change required; these are existing fields to be included):**

| Flag Field | Default | Controls |
|---|---|---|
| `featureCouponsEnabled` | `false` | Enables coupon validation at checkout |
| `featureReviewsEnabled` | `false` | Enables customer review submission |
| `featureWhatsappEnabled` | `false` | Enables WhatsApp notification delivery |
| `featurePayAtSalonEnabled` | `true` | Allows pay-at-salon payment method |
| `featureOnlinePaymentEnabled` | `true` | Allows Razorpay online payment |

**Usage pattern:**

```
PlatformSettingsService.get()     ← Redis cached; TTL 30 min
        ↓
if (!settings.featureCouponsEnabled)
    throw new BusinessRuleException('FEATURE_DISABLED', 'Coupons are not enabled.')
```

**Toggles are effective within 30 minutes** (matching the Redis TTL of `platform:settings`). For immediate effect, the admin can call `POST /platform-settings` to update the value, which automatically flushes the cache.

> [!NOTE]
> These feature flags are intentionally simple. A dedicated feature flag service (LaunchDarkly, Flagsmith) is a Phase 2 consideration when A/B testing or per-salon flag targeting is needed.

---

### 18.4 API Idempotency

Idempotency protection prevents duplicate operations when a client retries a request after a network timeout.

**Applies to:** `POST /appointments` and `POST /payments/orders`, `POST /payments/verify`.

**Header:** `Idempotency-Key: <client-generated UUID>`

**Server-side behavior:**

```
Request arrives with Idempotency-Key header
        ↓
IdempotencyMiddleware reads header value
        ↓
Check Redis: key = idempotency:{key}, TTL = 24 hours
        ↓
If EXISTS and status = COMPLETED
    → Return cached response immediately (no DB write, no side effect)
        ↓
If EXISTS and status = IN_PROGRESS
    → Return 409 Conflict (concurrent duplicate request)
        ↓
If NOT EXISTS
    → Store key with status = IN_PROGRESS
    → Process request normally
    → Store response with status = COMPLETED
    → Return response
```

**Edge cases:**
- If the key exists but the original request failed (status = FAILED), a retry is allowed.
- Idempotency keys are scoped per `userId` to prevent cross-user key collisions: `idempotency:{userId}:{key}`.
- If `Idempotency-Key` is absent on a protected route, the request is rejected with `400 Bad Request`.

**Redis key format:**
```
idempotency:{userId}:{idempotency-key}  →  { status, responseBody, statusCode }  TTL: 86400s
```

---

> [!CAUTION]
> **STOP POINT — Phase 5 Backend Architecture v5.1 Complete**
>
> The backend architecture specification is complete across all 18 deliverables.
>
> In strict accordance with phase rules, **no Controllers, Services, DTOs, Entities, APIs, Business Logic, Authentication code, or Prisma queries have been generated**.
>
> Please review and confirm:
> 1. **Approval** to proceed to **Phase 6: Backend Implementation** (feature-by-feature NestJS code generation), or
> 2. Any adjustments required before approval.
>
> I will wait for your explicit approval before starting Phase 6.
