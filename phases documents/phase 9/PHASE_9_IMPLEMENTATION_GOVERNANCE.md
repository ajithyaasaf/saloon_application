# PHASE_9_IMPLEMENTATION_GOVERNANCE.md
## Phase 9.0 – Platform Implementation Governance & Final Architectural Freeze

> **Status**: APPROVED & FROZEN  
> **Author Role**: Principal Software Architect  
> **Date**: 2026-08-06  
> **Depends On**: Phase 7 (Authentication – Frozen), Phase 8 (User Management – Frozen), Phase 9.0 Architecture & Technical Review  
> **Blocks**: Phase 9.1 – Implementation Slices

---

## 1. Dependency Injection Rules

To guarantee Clean Architecture and maintain strict separation of concerns, NestJS IoC dependency injection is governed by the following matrix.

### Dependency Injection Matrix

| Layer / Component | Allowed Injections | Forbidden Injections |
|-------------------|--------------------|----------------------|
| **Controllers** (`*.controller.ts`) | Domain `*Service` instances | `*Repository`, `PrismaService`, `RedisService`, `QueueService`, Infrastructure SDKs directly |
| **Domain Services** (`*.service.ts`) | Domain `*Repository`, `TransactionService`, `AuditLoggerService`, `RateLimiterHelper`, `IdempotencyHelper`, `ConfigService`, Interface Contracts (`IStorageProvider`, `IEmailProvider`, `IEventBus`) | `PrismaService` directly, Express `Request`/`Response` objects, Controllers |
| **Repositories** (`*.repository.ts`) | `PrismaService` | Domain `*Service`, `TransactionService`, `RedisService`, `QueueService`, Infrastructure SDKs |
| **Infrastructure Providers** (`src/infrastructure/*`) | `ConfigService`, `PrismaService` (for Health), `RedisService`, BullMQ `Queue` instances | Domain `*Service`, Domain `*Repository`, Controllers |
| **Shared Services** (`src/shared/*`) | `PrismaService`, `RedisService`, `ConfigService`, `PiiMaskerUtil` | Domain `*Service`, Domain `*Repository`, Controllers |
| **Guards & Interceptors** | `Reflector`, `ConfigService`, `RateLimiterHelper`, `JwtService` | Repositories, PrismaService |
| **Utilities** (`src/common/utils/*`) | **NONE** (Pure static functions) | Any IoC dependency |

---

## 2. Transaction Rules

The `TransactionService` (`ITransactionService`) manages database atomicity and isolation across repositories.

### MUST Use `TransactionService`

1. **Multi-Repository Writes**: Any operation mutating more than one database table (e.g. creating `Appointment` + `AppointmentService` rows + `Payment` record).
2. **State Write + Session Revocation**: Deactivating or soft-deleting an account (`User` table update + `user_sessions` delete).
3. **State Write + Media Row Creation**: Uploading avatar or salon image (`media` table insert + `users`/`salons` FK update).
4. **Credential Change**: Updating password hash or phone/email verification (`users` table update + `user_sessions` purge).
5. **Account Deletion**: Soft-deleting user, salon, or staff profile and invalidating linked active resources.

### MUST NOT Use `TransactionService`

1. **Single Read Queries**: `findById()`, `listUsers()`, `findByEmail()` read operations.
2. **Third-Party HTTP SDK Calls**: `Cloudinary`, `Twilio`, `SendGrid`, `Razorpay` API calls must **never** be placed inside a `TransactionService.run()` callback (prevents holding DB connections open during external network latency).
3. **Queue Dispatches**: `queueService.dispatch()` calls must occur **after** the database transaction has successfully committed.
4. **Long-Running Loops**: CPU-intensive loops or CSV processing blocks inside transactions.

---

## 3. Error Handling Rules

| Layer | `throw` Rules | `catch` Rules | `log` Rules | `rethrow` Rules |
|-------|---------------|---------------|-------------|-----------------|
| **Controller** | Never throws manually | Never catches | Never logs | N/A (Delegates exceptions to `GlobalExceptionFilter`) |
| **Domain Service** | Throws `DomainException` subclasses (`ResourceNotFoundException`, `BusinessConflictException`, `RateLimitExceededException`) | Catches non-fatal side-effect errors (audit, email dispatch failure) | Logs business warnings & unexpected errors with context | Re-throws unexpected exceptions wrapped in `DomainException` |
| **Repository** | Throws Prisma errors natively | Never catches (lets Prisma exceptions propagate to Service) | Never logs | N/A |
| **Infrastructure** | Throws `StorageException`, `MessagingException`, `QueueDispatchException` | Catches low-level SDK/network socket errors | Logs driver connection & third-party API errors | Wraps SDK errors into typed infrastructure exceptions |
| **Global Filter** | Formats error response | Catches all unhandled exceptions | Logs 500 Internal Server Errors with stack trace | Sends standardized JSON error envelope |

---

## 4. Logging & PII Protection Rules

### Allowed Logging Data
- Domain event names (e.g. `USER_PROFILE_UPDATED`, `BOOKING_CREATED`)
- Primary keys & UUIDs (`userId`, `salonId`, `appointmentId`, `jobId`)
- Request metadata (`requestId`, `ipAddress`, `httpMethod`, `routePath`, `statusCode`)
- Execution metrics (`durationMs`, `queueAttemptCount`)

### STRICTLY FORBIDDEN Data (Must NEVER appear in logs or audit text)

```
❌ Passwords / Plaintext Hashes
❌ JWT Access & Refresh Tokens
❌ SMS OTP Codes & Email Change Tokens
❌ Raw 10-digit Phone Numbers        → Must use PiiMaskerUtil.maskPhone() (e.g. ***43210)
❌ Raw Email Addresses              → Must use PiiMaskerUtil.maskEmail() (e.g. pr***@domain.com)
❌ Credit Card Numbers / CVV / VPA  → Must use PiiMaskerUtil.maskCardNumber()
❌ Bank Account & IFSC Details
❌ User Date of Birth & Full Home Address
```

---

## 5. Performance Limits per HTTP Request

To enforce high throughput (<50ms response latency for read API, <150ms for write API), every endpoint must adhere to the following resource caps:

| Resource Metric | Maximum Cap per Request | Enforcement |
|-----------------|-------------------------|-------------|
| **Database Queries** | Max 5 queries | Optimized via Prisma `include`/`select` or bulk operations |
| **Transaction Duration** | Max 2,000 ms | Enforced by `TransactionService` timeout default |
| **Redis Operations** | Max 10 commands | Enforced by pipeline or key encapsulation |
| **Queue Dispatches** | Max 3 dispatches | Event-driven background processing |
| **Cloudinary Stream API** | Max 1 upload | Memory storage buffer capped at 5 MB |
| **External HTTP Calls** | **0 synchronous calls** | Enqueued to BullMQ background workers |

---

## 6. Naming Standards

```
DTOs                  → <action>-<domain>.dto.ts        e.g. UpdateProfileDto, CreateSalonDto
Repositories          → <domain>.repository.ts        e.g. UserRepository, SalonRepository
Services              → <domain>.service.ts           e.g. UsersService, SalonsService
Infrastructure Drivers→ <driver>.service.ts           e.g. CloudinaryStorageService, EmailService
Helpers               → <feature>.helper.ts           e.g. RateLimiterHelper, IdempotencyHelper
Static Utilities      → <domain>.util.ts              e.g. MoneyUtil, DateTimeUtil, PiiMaskerUtil
Interfaces            → I<name>.interface.ts          e.g. IStorageProvider, IEmailProvider
Constants             → <name>.constant.ts            e.g. cache-keys.constant.ts, error-codes.constant.ts
Enums                 → PascalCase / UPPER_CASE       e.g. UserRole, Gender
Exceptions            → <name>.exception.ts           e.g. ResourceNotFoundException
Files                 → kebab-case.ts                 e.g. pii-masker.util.ts
Folders               → kebab-case                    e.g. infrastructure/storage/
```

---

## 7. Testing Standards & Coverage Targets

Every domain module and platform layer must meet the following automated unit/integration test coverage thresholds:

```
┌─────────────────────────────────────────────────────────┐
│               AUTOMATED COVERAGE TARGETS                │
├────────────────────────────────┬────────────────────────┤
│ Static Utilities (`common/utils`)│ 100% Code Coverage     │
│ Shared Services (`shared/`)     │  95% Code Coverage     │
│ Domain Services (`domains/`)    │  90% Code Coverage     │
│ Controllers (`domains/`)        │  85% Code Coverage     │
│ Repositories (`domains/`)       │  80% Code Coverage     │
│ Infrastructure (`infrastructure`)│ 80% Code Coverage     │
└────────────────────────────────┴────────────────────────┘
```

---

## 8. Code Review Checklist (Mandatory Pre-Freeze Gate)

Before any new domain module (Phase 10 Salon, Phase 11 Catalog, Phase 12 Booking) can be approved and frozen, it must pass 100% of this checklist:

- [ ] **No Business Logic in Controller**: Controller only validates DTOs and delegates to Service.
- [ ] **No Direct Prisma Outside Repository**: No `prismaService` or `db.` calls in Services or Controllers.
- [ ] **No Direct Redis Outside Shared Helpers**: Domain Services consume `CacheHelper`, `RateLimiterHelper`, or `IdempotencyHelper`.
- [ ] **No External SDK Calls in Domain Services**: Third-party SDKs wrapped in `infrastructure/` providers implementing interfaces.
- [ ] **DTO Validation Complete**: Every request DTO property decorated with `class-validator` and `class-transformer`.
- [ ] **Strict Response Serialization**: Response DTOs use `@Exclude()` and `@Expose()` to block sensitive columns.
- [ ] **Swagger Documentation Complete**: Every route has `@ApiOperation`, `@ApiResponse`, `@ApiTags`, and `@ApiBearerAuth`.
- [ ] **Zero Circular Dependencies**: Monitored via ESLint `import/no-restricted-paths`.
- [ ] **PII Masked in Logs & Audit**: Email, phone, OTP, tokens masked via `PiiMaskerUtil`.
- [ ] **Database Transactions Atomic**: Multi-write operations use `TransactionService`.
- [ ] **Unit Tests Passing**: All tests pass and satisfy coverage targets.

---

## 9. Final Freeze Decision & Implementation Roadmap

### Architecture Status: **OFFICIALLY FROZEN**

Phase 9.0 Architecture, Technical Review, and Governance are **100% APPROVED and LOCKED**. No further architectural modifications are permitted.

---

### Phase 9.1+ Implementation Roadmap

Implementation will proceed in strict sequential review slices:

- **Phase 9.1 — Common Layer Utilities & Exception System**
  - Implement 14 pure static utilities (`MoneyUtil`, `DateTimeUtil`, `PiiMaskerUtil`, `PaginationUtil`, `SortUtil`, `FilterUtil`, `SearchUtil`, `FileValidationUtil`, `ImageValidationUtil`, `ValidationUtil`, `IdGeneratorUtil`, `ResponseBuilder`, `SecurityUtil`, `RetryHelper`).
  - Implement domain error codes (`ERROR_CODES`) and exception class hierarchy.

- **Phase 9.2 — Infrastructure Abstraction Layer**
  - Implement contracts: `IStorageProvider`, `IEmailProvider`, `ISmsProvider`, `IWhatsAppProvider`, `IPushProvider`, `IQueueProvider`, `ICacheProvider`, `IEventBus`, `IFeatureFlagProvider`.
  - Implement concrete infrastructure services (`CloudinaryStorageService`, `EmailService`, `SmsService`, `WhatsAppService`, `PushNotificationService`, `EventBusService`, `FeatureFlagService`, `HealthService`).

- **Phase 9.3 — Shared Platform Services**
  - Implement `TransactionService` (`ITransactionService`).
  - Implement `AuditLoggerService`, `RateLimiterHelper`, `IdempotencyHelper`.
  - Wire `InfrastructureModule` and `SharedModule`.

- **Phase 9.4 — Integration Testing & Governance Verification**
  - Unit test suite for all shared utilities and infrastructure providers.
  - Final Phase 9 readiness audit before beginning Phase 10 (Salon Management Module).

---

*End of PHASE_9_IMPLEMENTATION_GOVERNANCE.md*  
*Phase 9.1 – Common Layer Implementation begins upon explicit user approval.*
