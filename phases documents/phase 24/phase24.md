# PHASE 24 — CUSTOMER MOBILE APP

## Background

Phase 23 (Salon Owner & Staff Web Dashboard) is **FULLY VERIFIED & FROZEN**.

Phase 24 establishes the **Customer Mobile App (`apps/customer-mobile`)**: a high-performance cross-platform B2C mobile application built with React Native, Expo SDK 51+, and TypeScript. It serves as the primary consumer-facing client application for salon discovery, real-time appointment booking, online payment checkout via Razorpay, loyalty rewards tracking, customer profile management, review submission, and push notifications.

---

## Technical Specifications & Architecture

### 1. Technology Decisions
- **Framework**: React Native with Expo (SDK 51+)
- **Navigation**: Expo Router (file-based routing with route groups `(auth)` and `(app)`)
- **Server State**: React Query (`@tanstack/react-query`) for background caching and optimistic UI updates
- **Secure Token Storage**: `expo-secure-store` implementing the `ITokenStorage` interface from `@saloon/shared-utils`
- **HTTP Client**: `ApiClient` singleton from `@saloon/shared-utils` (handling 401 refresh queues and Bearer tokens)
- **Payment Processing**: Native Razorpay sheet integration via `react-native-razorpay` with backend HMAC signature verification
- **Styling**: Vanilla React Native `StyleSheet` with shared design system tokens and glassmorphism

---

## Core User Journeys & Screen Modules

1. **Authentication Flow (OTP Only)**:
   - Phone number entry with Indian mobile validation (`isValidIndianPhone`).
   - 6-digit OTP verification with timer countdown (`POST /api/v1/auth/otp/verify`).
   - Secure token persistence in hardware-backed storage (`expo-secure-store`).
2. **Discovery & Salon Profiles (`(tabs)/home`)**:
   - Salon search and nearby branch listings.
   - Salon detail with service catalog, gallery photos, operating hours, and customer reviews.
3. **Multi-Step Appointment Booking (`(tabs)/bookings/new`)**:
   - Treatment selector with stylist preferences.
   - Live time-slot picker querying available schedule windows (`POST /api/v1/booking/slots`).
   - Booking confirmation summary with coupon discount validation.
4. **Online Payments & Checkout**:
   - Razorpay order initiation (`POST /api/v1/payment/initiate`).
   - Native checkout sheet presentation.
   - Payment verification callback (`POST /api/v1/payment/verify`).
5. **Booking History & Appointment Lifecycle (`(tabs)/bookings`)**:
   - Active, upcoming, and past appointment history.
   - Cancellation and reschedule workflows.
   - Verified post-visit review submission with rating stars and photo upload.
6. **Customer CRM, Loyalty & Wallet (`(tabs)/profile`)**:
   - Loyalty tier status (`CustomerTier`), points ledger, and wallet balance.
   - Customer preferences and avatar upload via Phase 20 presigned media engine.
7. **Notification Inbox (`(tabs)/notifications`)**:
   - Push notification registration via `expo-notifications`.
   - Real-time inbox with unread count badge.

---

## Verification & Completion Plan

- [ ] Expo project initialized under `apps/customer-mobile` and registered in Turborepo
- [ ] Shared monorepo packages (`@saloon/shared-types`, `@saloon/shared-utils`, `@saloon/config`) linked and type-checked
- [ ] `SecureStoreTokenStorage` implementing `ITokenStorage` verified
- [ ] OTP authentication flow operational
- [ ] All 8 domain service modules implemented with typed `ApiClient`
- [ ] All UI primitives and domain widgets built with design tokens
- [ ] All screen routes implemented across tabs and auth stacks
- [ ] Razorpay native checkout flow integrated and verified in test mode
- [ ] Component and service unit test suites passing
- [ ] Monorepo TypeScript check clean (0 errors)
- [ ] Turborepo production build clean across all packages
- [ ] Phases 1 through 23 remain 100% intact and frozen
