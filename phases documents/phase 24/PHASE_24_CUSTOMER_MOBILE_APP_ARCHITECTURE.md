# PHASE 24 — CUSTOMER MOBILE APP ARCHITECTURE BLUEPRINT

**Status**: SPECIFICATION & IMPLEMENTATION ROADMAP  
**Module**: Phase 24 — Customer Mobile Application  
**Scope**: React Native / Expo Mobile App, OTP Phone Authentication, Salon Discovery, Appointment Booking Engine, Razorpay Mobile Checkout, Loyalty Rewards, Customer CRM Profile, Review Submissions, and Push Notification Handling  
**Target Platform**: `apps/customer-mobile` (React Native / Expo SDK 51+ / Expo Router / TypeScript / React Query / SecureStore / Razorpay)

---

## 1. Purpose & Core Architectural Principles

Phase 24 introduces the consumer-facing mobile application for the Saloon SaaS platform. It serves as the primary B2C channel for customers to find nearby salons, book treatments, pay securely via UPI/Cards, manage booking statuses, earn rewards points, and upload review photos.

### 1.1 Non-Negotiable Architectural Rules
1. **Backend is the Sole Authorization Boundary**: All pricing calculations, discount evaluations, time slot availability checks, and Razorpay HMAC signature verifications are performed by `@saloon/api`. The mobile app is a pure presentation and workflow client.
2. **OTP-Only Authentication for Customers**: In alignment with consumer expectations in India, customer authentication is strictly phone-number based using OTP verification (`/api/v1/auth/otp/send` and `/api/v1/auth/otp/verify`). No password login exists for the `CUSTOMER` role.
3. **Pluggable Token Storage via Hardware Enclave**: Access and refresh tokens are stored in hardware-backed secure storage (`expo-secure-store`) using the `SecureStoreTokenStorage` adapter conforming to `ITokenStorage`.
4. **Phase 20 Media Engine Adherence**: User avatars and review photo uploads strictly use the presigned direct-to-cloud upload pipeline (`/api/v1/media/upload/presigned`), bypassing the mobile API server for binary transfer.
5. **Universal Monorepo Reuse**: The mobile app consumes `@saloon/shared-types`, `@saloon/shared-utils`, and `@saloon/config` directly, eliminating duplication of DTOs, enums, formatters, and route paths.

---

## 2. System Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER MOBILE APP (EXPO)                      │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      EXPO ROUTER LAYOUTS                       │   │
│   │  _layout.tsx (QueryClientProvider, AuthProvider, NotifProvider)│   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│             ┌─────────────────────┴─────────────────────┐              │
│             ▼                                           ▼              │
│   ┌───────────────────────────┐               ┌────────────────────┐   │
│   │   (auth) Stack Group      │               │  (app) Tab Group   │   │
│   │  - phone.tsx              │               │  - (tabs)/home     │   │
│   │  - otp-verify.tsx         │               │  - (tabs)/bookings │   │
│   │                           │               │  - (tabs)/notifs   │   │
│   │                           │               │  - (tabs)/profile  │   │
│   │                           │               │  - payment/checkout│   │
│   └───────────────────────────┘               └────────────────────┘   │
│                                                         │              │
│   ┌─────────────────────────────────────────────────────▼──────────┐   │
│   │                       DOMAIN HOOKS LAYER                       │   │
│   │   useAuth │ useSalons │ useBookings │ useCustomerProfile       │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────▼────────────────────────────────┐   │
│   │                      TYPED SERVICES LAYER                      │   │
│   │  authService │ salonService │ bookingService │ paymentService  │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────▼────────────────────────────────┐   │
│   │         ApiClient (from @saloon/shared-utils)                  │   │
│   │   - SecureStoreTokenStorage (expo-secure-store)                │   │
│   │   - 401 Single-Flight Token Refresh Mutex                      │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ HTTPS (Bearer Auth)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API (@saloon/api)                       │
│    Auth │ Salons │ ServiceCatalog │ Booking │ Payment │ Notifications  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Layout & File Organization

```
apps/customer-mobile/
├── app.json                          # Expo configuration (deep linking, bundle IDs)
├── package.json                      # @saloon/customer-mobile
├── tsconfig.json                     # Extends typescript-config
├── babel.config.js                   # Expo Babel preset with Expo Router plugin
├── jest.config.js                    # jest-expo configuration
│
├── src/
│   ├── app/                          # File-based routes (Expo Router)
│   │   ├── _layout.tsx               # Global root providers
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx           # Auth stack layout (redirects if authenticated)
│   │   │   ├── phone.tsx             # Phone input screen with Indian phone validation
│   │   │   └── otp-verify.tsx        # 6-digit OTP verification screen
│   │   └── (app)/
│   │       ├── _layout.tsx           # Protected tab navigator layout
│   │       ├── (tabs)/
│   │       │   ├── home/
│   │       │   │   ├── index.tsx     # Discovery feed & salon list
│   │       │   │   └── [salonId].tsx # Salon detail & service menu
│   │       │   ├── bookings/
│   │       │   │   ├── index.tsx     # Active & past bookings list
│   │       │   │   ├── [bookingId].tsx # Booking details & review trigger
│   │       │   │   └── new.tsx       # Multi-step booking wizard
│   │       │   ├── notifications/
│   │       │   │   └── index.tsx     # Push notification inbox
│   │       │   └── profile/
│   │       │       ├── index.tsx     # Profile overview (loyalty, wallet balance)
│   │       │       ├── edit.tsx      # Preferences & profile edit
│   │       │       └── settings.tsx  # App settings & logout
│   │       └── payment/
│   │           └── checkout.tsx      # Payment confirmation & Razorpay sheet
│   │
│   ├── components/
│   │   ├── ui/                       # Button, Card, Input, Badge, Avatar, Spinner, EmptyState
│   │   ├── booking/                  # BookingCard, ServiceSelector, SlotPicker, BookingSummary
│   │   ├── salon/                    # SalonCard, BranchCard, ReviewCard
│   │   └── notification/             # NotificationItem
│   │
│   ├── design-system/
│   │   ├── tokens.ts                 # Colors, typography, spacing, radius
│   │   └── styles.ts                 # Shared StyleSheet definitions
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx           # OTP auth state, token lifecycle
│   │   └── NotificationContext.tsx   # Push token registration & badge sync
│   │
│   ├── services/
│   │   ├── api-client.ts             # ApiClient initialized with SecureStoreTokenStorage
│   │   ├── auth.service.ts
│   │   ├── salon.service.ts
│   │   ├── booking.service.ts
│   │   ├── payment.service.ts
│   │   ├── customer.service.ts
│   │   ├── review.service.ts
│   │   ├── notification.service.ts
│   │   └── media.service.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSalons.ts
│   │   ├── useBookings.ts
│   │   ├── useNotifications.ts
│   │   └── useCustomerProfile.ts
│   │
│   └── utils/
│       └── secure-store-token-storage.ts # ITokenStorage adapter using expo-secure-store
│
└── __tests__/
    ├── services/
    │   ├── auth.service.test.ts
    │   ├── booking.service.test.ts
    │   └── payment.service.test.ts
    └── components/
        ├── Button.test.tsx
        ├── BookingCard.test.tsx
        └── SalonCard.test.tsx
```

---

## 4. End-to-End User Workflows

### 4.1 OTP Authentication Flow
1. User enters mobile number on `phone.tsx`.
2. Input is validated using `isValidIndianPhone(phone)` from `@saloon/shared-utils`.
3. Calls `authService.sendOtp({ phone })` (`POST /api/v1/auth/otp/send`).
4. Navigates to `otp-verify.tsx` with auto-focusing 6-digit pin input and 30-second resend countdown.
5. On entry, calls `authService.verifyOtp({ phone, otp })` (`POST /api/v1/auth/otp/verify`).
6. `AuthResponseDto` is received; tokens are saved to `expo-secure-store`; user session is set in `AuthContext`; router redirects to `(app)/(tabs)/home`.

### 4.2 Salon Discovery & Service Browsing Flow
1. `(tabs)/home/index.tsx` fetches salon listings using `useSalons()` (`GET /api/v1/salons`).
2. User taps a salon card to navigate to `[salonId].tsx`.
3. Salon details, branch selectors, treatment categories, pricing (`formatINR`), and verified reviews (`GET /api/v1/reviews/branch/:id`) are displayed.
4. User taps "Book Appointment".

### 4.3 Multi-Step Appointment Booking Flow
1. **Step 1 (Select Treatments)**: Multi-select service items with optional preferred stylist assignment.
2. **Step 2 (Select Date & Time)**: Queries available slots via `bookingService.getAvailableSlots()` (`GET /api/v1/booking/slots`) for the chosen date and selected services.
3. **Step 3 (Summary & Discounts)**: Displays subtotal, tax breakdown (`calculateGST`), optional promo coupon validation (`POST /api/v1/promotions/coupons/validate`), and payment method selection (`ONLINE` or `PAY_AT_SALON`).
4. **Step 4 (Booking Creation)**: Calls `bookingService.createBooking()` (`POST /api/v1/booking`).
   - If `PAY_AT_SALON`: navigates to booking confirmation.
   - If `ONLINE`: navigates to `payment/checkout.tsx`.

### 4.4 Razorpay Mobile Payment Checkout Flow
1. `payment/checkout.tsx` calls `paymentService.initiatePayment({ bookingId, paymentMethod: PaymentMethod.UPI })`.
2. Backend creates Razorpay order and returns `RazorpayOrderDto` (`orderId`, `amount`, `currency`, `keyId`).
3. App invokes `RazorpayCheckout.open(options)` with user phone, email, and order metadata.
4. Native Razorpay sheet renders UPI apps (GPay, PhonePe, Paytm), Cards, and Netbanking.
5. On payment completion, callback returns `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
6. App forwards callback payload to `paymentService.verifyPayment()` (`POST /api/v1/payment/verify`).
7. Backend validates cryptographic HMAC signature and updates invoice status to `PAID`.
8. User is transitioned to booking confirmation screen with confirmed status.

### 4.5 Post-Service Review & Media Submission
1. In booking history `[bookingId].tsx`, when appointment status is `COMPLETED`, "Write a Review" button activates.
2. User selects star rating (1–5) across Overall, Cleanliness, Staff, and Value.
3. Optional photo attachments use `expo-image-picker` to select camera/gallery images.
4. Images are uploaded directly to R2/S3 using the Phase 20 presigned upload flow (`mediaService.getPresignedUpload()`).
5. Review is submitted via `reviewService.createReview()` (`POST /api/v1/reviews`).

---

## 5. Verification & Test Plan

```bash
# Customer mobile test execution
pnpm test --filter @saloon/customer-mobile

# Monorepo type-check validation
pnpm turbo run type-check

# Shared packages regression
pnpm test --filter @saloon/shared-utils
pnpm test --filter @saloon/config
pnpm test --filter @saloon/api
```

---

## 6. Phase 24 Sign-Off Criteria

- [ ] `apps/customer-mobile` fully initialized and integrated in monorepo
- [ ] OTP auth, token persistence, and route protection verified
- [ ] Discovery, booking, payment, profile, review, and notification features complete
- [ ] Unit tests for services and components passing
- [ ] Turborepo production build succeeds with 0 errors
- [ ] Backend API regression remains 100% green
