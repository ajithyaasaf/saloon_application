# PHASE 22 — SHARED MONOREPO PACKAGES & CLIENT SDK FOUNDATION ARCHITECTURE BLUEPRINT

**Status**: COMPLETED, VERIFIED & FROZEN  
**Module**: Phase 22 — Shared Monorepo Packages & Client SDK Foundation  
**Scope**: Universal TypeScript contracts, canonical domain enums, enterprise utilities, type-safe API client layer, token refresh queue mutex, route mapping, and configuration constants across all monorepo clients  
**Target Platform**: Monorepo packages (`@saloon/shared-types`, `@saloon/shared-utils`, `@saloon/config`) consumed by Next.js apps, Expo React Native mobile apps, and backend services

---

## 1. Purpose & Core Architectural Invariants

Phase 22 creates the shared contract foundation for the entire multi-client platform. It eliminates code duplication, prevents drift between backend and frontend data shapes, and provides a unified transport layer for HTTP communication.

### Core Architectural Rules
1. **Zero Server Dependency Leakage**: Shared packages must never import NestJS, Prisma, TypeORM, or backend-specific server modules.
2. **Canonical Data Contracts**: Frontends must consume domain models, DTOs, and enums directly from `@saloon/shared-types` rather than declaring ad-hoc local interfaces.
3. **Pluggable Storage Abstraction**: The HTTP client (`ApiClient`) must operate identically in Node.js, Web browsers (localStorage/cookies), and React Native mobile (`expo-secure-store`) via the `ITokenStorage` interface.
4. **Single-Flight Refresh Mutex**: When access tokens expire, multiple parallel HTTP requests must be queued while a single token refresh call executes, preventing 401 storms.

---

## 2. Monorepo Architecture & Dependency Graph

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CONSUMING APPLICATIONS                        │
│   apps/salon-dashboard    │    apps/customer-mobile    │  apps/admin   │
└──────────────┬───────────────────────────┬──────────────────────┬──────┘
               │                           │                      │
               ▼                           ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SHARED MONOREPO PACKAGES                        │
│                                                                        │
│   ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────┐  │
│   │ packages/shared-types│  │ packages/shared-utils│  │  packages/  │  │
│   │                      │  │                      │  │   config    │  │
│   │ - Domain Enums       │  │ - Currency & GST     │  │             │  │
│   │ - DTO Interfaces     │  │ - DateTime & Slots   │  │ - API_ROUTES│  │
│   │ - Response Envelopes │  │ - PII Masking        │  │ - Constants │  │
│   │ - Pagination Types   │  │ - ApiClient (401 Mtx)│  │             │  │
│   └──────────▲───────────┘  └──────────┬───────────┘  └──────▲──────┘  │
│              │                         │                     │         │
│              └─────────────────────────┴─────────────────────┘         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Package Specifications & Capabilities

### 3.1 `@saloon/shared-types`
- **Enums**: 32 canonical domain enums mirrored from the Prisma database schema.
- **Envelope Contracts**:
  ```typescript
  export interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    message: string;
    data: T;
    timestamp: string;
    path: string;
    correlationId?: string;
  }
  ```
- **Domain DTOs**: 13 business domain models covering Auth, Users, Salon, Service Catalog, Staff, Booking, Payment, Customer, Inventory, Reviews, Promotions, Notifications, and Media.

### 3.2 `@saloon/shared-utils`
- **Currency & Financials**:
  - `formatINR(amount: number): string` → Formats Indian Rupee values with proper grouping (e.g. `₹1,24,500.00`).
  - `calculateGST(amount: number, rate: number)` → Tax breakdown calculations.
- **Date & Appointment Slot Arithmetic**:
  - `timeStringToMinutes(time: string): number`
  - `minutesToTimeString(minutes: number): string`
  - `addMinutesToTime(time: string, duration: number): string`
  - `doTimeRangesOverlap(start1, end1, start2, end2): boolean`
  - `formatDateToISTString(date: string | Date): string`
- **Type-Safe `ApiClient` Architecture**:
  - Encapsulates `fetch` with Bearer auth, custom headers, and query parameter serialization.
  - Implements concurrency-safe token refreshing:
  ```typescript
  private async handle401Refresh<T>(requestFn: () => Promise<T>): Promise<T> {
    if (this.isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject, retryFn: requestFn });
      });
    }
    this.isRefreshing = true;
    try {
      const newTokens = await this.refreshToken();
      await this.tokenStorage.setTokens(newTokens);
      const result = await requestFn();
      this.flushQueue(null, newTokens);
      return result;
    } catch (err) {
      this.flushQueue(err, null);
      throw err;
    } finally {
      this.isRefreshing = false;
    }
  }
  ```

### 3.3 `@saloon/config`
- **`API_ROUTES`**: Complete, centralized mapping of 80+ endpoints categorized by domain.
- **`PLATFORM_CONSTANTS`**: Centralized system rules:
  - `CURRENCY`: `INR`
  - `TIMEZONE`: `Asia/Kolkata`
  - `MAX_FILE_SIZE_BYTES`: 10MB
  - `ALLOWED_IMAGE_MIME_TYPES`: `['image/jpeg', 'image/png', 'image/webp']`

---

## 4. Test Verification & Quality Assurance

| Test Suite | Location | Tests Count | Status |
|---|---|---|---|
| Currency utilities | `packages/shared-utils/src/tests/currency.spec.ts` | 6 tests | ✅ Passed |
| Date & Slot arithmetic | `packages/shared-utils/src/tests/datetime.spec.ts` | 9 tests | ✅ Passed |
| Format & Validators | `packages/shared-utils/src/tests/validation.spec.ts` | 10 tests | ✅ Passed |
| PII Masking | `packages/shared-utils/src/tests/masking.spec.ts` | 5 tests | ✅ Passed |
| File & MIME utils | `packages/shared-utils/src/tests/file.spec.ts` | 5 tests | ✅ Passed |
| ApiClient & 401 Queue Mutex | `packages/shared-utils/src/tests/api-client.spec.ts` | 7 tests | ✅ Passed |
| Config Routes & Constants | `packages/config/src/tests/config.spec.ts` | 3 tests | ✅ Passed |
| **Total Shared Tests** | **7 test suites** | **45 tests** | **100% Green** |
