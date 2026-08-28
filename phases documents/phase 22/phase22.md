# PHASE 22 — SHARED MONOREPO PACKAGES & CLIENT SDK FOUNDATION

## Background

Phase 21 (Production Integration & Consumer Migration) is **FULLY VERIFIED & FROZEN**.

Phase 22 establishes the **Shared Monorepo Packages & Client SDK Foundation**: creating decoupled, type-safe shared packages (`packages/shared-types`, `packages/shared-utils`, and `packages/config`) to serve as the unified bridge between the NestJS backend API and all frontend applications (`apps/salon-dashboard`, `apps/customer-mobile`, `apps/admin-dashboard`).

---

## Deliverables & Package Architecture

### 1. `packages/shared-types`
Provides canonical types, DTOs, enums, and API response structures for all 13 domain modules:
- **Enums**: `UserRole`, `Gender`, `SalonStatus`, `BranchStatus`, `DayOfWeek`, `ClosureType`, `StaffStatus`, `LeaveType`, `LeaveStatus`, `BookingStatus`, `BookingPaymentType`, `PaymentStatus`, `PaymentMethod`, `InvoiceStatus`, `RefundStatus`, `CustomerTier`, `LoyaltyTransactionType`, `StockMovementType`, `PurchaseOrderStatus`, `StockTransferStatus`, `ReviewRating`, `ReviewModerationStatus`, `DiscountType`, `CouponEligibilityAudience`, `GiftCardStatus`, `FlashSaleStatus`, `NotificationChannel`, `NotificationStatus`, `NotificationPriority`, `NotificationCategory`, `FileStatus`, `FileVisibility`, `FileCategory`.
- **Common Types**: `ApiResponse<T>`, `ApiErrorResponse`, `PaginatedResult<T>`, `PaginationMeta`, `GeoLocation`.
- **Domain DTOs**: Auth, Users, Salon & Branches, Service Catalog, Staff & Shifts, Booking & Slots, Payment & Invoices, Customer CRM, Inventory & Stock, Reviews & Ratings, Promotions & Coupons, Notifications, File & Media.

### 2. `packages/shared-utils`
Provides domain logic, formatting, and client-side communication primitives:
- **Currency & Finance Calculations**: `formatINR`, `rupeesToPaise`, `paiseToRupees`, `calculateGST`, `calculateDiscount`.
- **DateTime & Slot Arithmetic**: `timeStringToMinutes`, `minutesToTimeString`, `addMinutesToTime`, `isTimeInRange`, `doTimeRangesOverlap`, `formatDuration`, `isWithinQuietHours`, `formatDateToISTString`.
- **Indian Locale & Format Validators**: `isValidIndianPhone`, `normalizeIndianPhone`, `isValidGSTIN`, `isValidPAN`, `isValidIndianPinCode`, `isValidIFSC`, `isValidEmail`, `generateSlug`.
- **Data Protection & PII Masking**: `maskPhone`, `maskEmail`, `maskCardNumber`, `maskBankAccount`.
- **MIME & File Helpers**: `formatBytes`, `getExtensionFromMimeType`, `getMimeTypeFromExtension`, `isImageMimeType`, `sanitizeFileName`.
- **Type-Safe API Client (`ApiClient`)**:
  - Pluggable token storage contract (`ITokenStorage`, `InMemoryTokenStorage`).
  - Standardized error model (`ApiClientError`).
  - Single-flight token refresh mutex with request queue coalescing on 401 Unauthorized responses.
  - Automatic Bearer token injection and `x-request-id` header tracing.

### 3. `packages/config`
Centralizes global configuration constants and API route mapping:
- **`API_ROUTES`**: Centralized route dictionary matching all backend endpoints across auth, users, salons, services, staff, bookings, payments, customers, inventory, reviews, promotions, notifications, and media.
- **`PLATFORM_CONSTANTS`**: Default limits, currency (`INR`), timezone (`Asia/Kolkata`), pagination defaults, MIME whitelist, and upload limits.

---

## Verification & Sign-Off Criteria

- [x] `packages/shared-types` created, compiled cleanly with strict TypeScript declarations
- [x] `packages/shared-utils` implemented with 100% passing unit tests (45 tests across 7 suites)
- [x] `packages/config` implemented with complete route dictionary and constants
- [x] Shared `ApiClient` single-flight 401 token refresh queue verified with test suite
- [x] Backend API regression remains 245/245 suites green (1,678 tests)
- [x] Turborepo monorepo build (`turbo run build`) succeeds across all packages
- [x] Phases 1 through 21 remain 100% intact and frozen
