# PHASE 18 — COUPONS, PROMOTIONS, DISCOUNTS, GIFT CARDS & MARKETING ENGINE ARCHITECTURE BLUEPRINT

**Status**: FROZEN ARCHITECTURE SPECIFICATION  
**Module**: Phase 18 — Coupons, Promotions, Discounts, Gift Cards & Marketing Engine  
**Scope**: Multi-Tenant Salon ERP — Promotional Campaigns, Discount Rules, Auto-Apply Cart Discounts, Promo Codes, Gift Card / Voucher Ledgers, Flash Sales, and Marketing Analytics  
**Target Platform**: `@saloon/api` (NestJS / Prisma / PostgreSQL / Redis / BullMQ)

---

## 1. Purpose & Vision
The **Coupons, Promotions, Discounts, Gift Cards & Marketing Engine** powers customer acquisition, booking conversion, basket-size optimization, retention marketing, and prepaid revenue generation for salons and branches. 

Salons can create targeted discount campaigns (percentage, flat amount, free addon treatments), configure fine-grained redemption constraints (happy hours, minimum cart thresholds, service/stylist restrictions, customer tier exclusivity), issue and redeem multi-use prepaid gift cards, launch time-limited flash sales, and measure marketing return on investment (ROI).

---

## 2. Scope & Core Capabilities

1. **Multi-Type Promotional Discounts**:
   - `PERCENTAGE` (with optional `maxDiscountAmount` cap).
   - `FIXED_AMOUNT` (flat cash deduction).
   - `FREE_SERVICE` (100% discount on specific add-on or qualifying treatment).
   - `CASHBACK` (credited to customer CRM wallet post-checkout).

2. **Granular Redemption Rules & Constraints**:
   - **Cart Constraints**: `minBookingAmount`, `minServicesCount`.
   - **Usage Limits**: `totalUsageLimit` (global campaign cap), `perCustomerLimit` (e.g. 1 per client).
   - **Audience Eligibility**: `ALL_CUSTOMERS`, `FIRST_TIME_ONLY`, `VIP_MEMBERS_ONLY`, `RETURNING_CUSTOMERS_ONLY`, `SPECIFIC_CUSTOMERS`.
   - **Service & Branch Scoping**: White-list/black-list of specific services, service categories, branches, or stylists.
   - **Time & Happy Hour Windows**: Day of week filtering (e.g. Mon–Thu only) and time window restrictions (e.g. 11:00 AM – 3:00 PM).

3. **Auto-Apply vs. Promo Code Mechanics**:
   - **Code-Based Coupons**: Customer or front-desk enters uppercase alphanumeric code (e.g. `DIWALI20`, `WELCOME50`).
   - **Auto-Applied Cart Promotions**: System evaluates eligible bookings during slot selection/checkout without requiring manual code entry.
   - **Stackability Policy**: Configurable `isCombinableWithOtherOffers` flag preventing excessive discount stacking.

4. **Audited Redemption Ledger (`CouponUsage`)**:
   - Immutable audit trail linking redemptions to `Booking`, `Invoice`, `Customer`, and `Salon`.
   - Reversal workflow for cancelled or refunded bookings (restoring customer quota).

5. **Prepaid Gift Cards & Digital Vouchers (`GiftCard`)**:
   - Unique 16-character alphanumeric gift card tokens.
   - Purchaser $\rightarrow$ Recipient gifting workflow with personalized message and delivery channels.
   - Real-time balance tracking with debit/credit audit ledger (`GiftCardTransaction`).
   - Partial redemption across multiple appointments.

6. **Flash Sales & Urgent Slot Deals (`FlashSale`)**:
   - Time-bound, high-discount promotions designed to fill off-peak stylist slots.
   - Limited slot quota with real-time atomic reservation counters.

7. **Omnichannel Marketing Campaigns (`MarketingCampaign`)**:
   - Coordinated marketing initiatives linking promotional offers, audience segments, communication channels, and conversion metrics.

---

## 3. Bounded Context & Integration Boundaries

- **Booking Engine (Phase 13)**: Validates coupon applicability against cart items during slot checkout; records applied coupon in booking summary.
- **Payments & Billing (Phase 14)**: Applies calculated discounts to `Invoice` line items; handles gift card redemptions as a payment method.
- **Customer CRM (Phase 15)**: Enforces customer eligibility (first-time, VIP status, membership tier, wallet cashback credits).
- **Service Catalog (Phase 11)**: Provides service and category validation for targeted promotions.
- **Staff Management (Phase 12)**: Enforces stylist eligibility on service discounts.
- **Salon Governance (Phase 10)**: Provides tenant hierarchy (`Salon` and `Branch`).

---

## 4. Database Entities & Schemas

### 4.1 `Promotion` / `Coupon`
- `id` (UUID, PK)
- `salonId` (UUID, FK $\rightarrow$ `Salon`, nullable for platform-wide campaigns)
- `code` (VARCHAR(32), Unique per salon / global, uppercase)
- `name` (VARCHAR(100))
- `description` (TEXT)
- `discountType` (ENUM: `PERCENTAGE`, `FIXED_AMOUNT`, `FREE_SERVICE`, `CASHBACK`)
- `discountValue` (DECIMAL(10,2) - percentage rate or fixed amount in cents/paisa)
- `maxDiscountAmount` (INT, nullable - max cap for percentage discounts)
- `minBookingAmount` (INT, default 0 - minimum cart subtotal)
- `minServicesCount` (INT, default 1)
- `applicabilityType` (ENUM: `ALL_SERVICES`, `SPECIFIC_SERVICES`, `SPECIFIC_CATEGORIES`, `SPECIFIC_BRANCHES`)
- `customerEligibility` (ENUM: `ALL_CUSTOMERS`, `FIRST_TIME_ONLY`, `VIP_ONLY`, `MEMBERSHIP_HOLDERS`, `SPECIFIC_CUSTOMERS`)
- `totalUsageLimit` (INT, nullable)
- `perCustomerLimit` (INT, default 1)
- `currentUsageCount` (INT, default 0)
- `isAutoApply` (BOOLEAN, default false)
- `isCombinableWithOtherOffers` (BOOLEAN, default false)
- `isHappyHour` (BOOLEAN, default false)
- `validDaysOfWeek` (INT[], default [])
- `validStartTime` (VARCHAR(8), nullable - HH:mm:ss)
- `validEndTime` (VARCHAR(8), nullable - HH:mm:ss)
- `startDate` (TIMESTAMPTZ)
- `endDate` (TIMESTAMPTZ)
- `status` (ENUM: `DRAFT`, `ACTIVE`, `PAUSED`, `EXPIRED`, `DEPLETED`, `ARCHIVED`)
- `version` (INT, default 1)
- `createdAt`, `updatedAt`, `deletedAt` (TIMESTAMPTZ)

### 4.2 `CouponServiceApplicability`
- `id` (UUID, PK)
- `couponId` (UUID, FK $\rightarrow$ `Coupon`, Cascade)
- `serviceId` (UUID, FK $\rightarrow$ `Service`, Restrict)
- `createdAt` (TIMESTAMPTZ)

### 4.3 `CouponCategoryApplicability`
- `id` (UUID, PK)
- `couponId` (UUID, FK $\rightarrow$ `Coupon`, Cascade)
- `categoryId` (UUID, FK $\rightarrow$ `ServiceCategory`, Restrict)
- `createdAt` (TIMESTAMPTZ)

### 4.4 `CouponBranchApplicability`
- `id` (UUID, PK)
- `couponId` (UUID, FK $\rightarrow$ `Coupon`, Cascade)
- `branchId` (UUID, FK $\rightarrow$ `Branch`, Restrict)
- `createdAt` (TIMESTAMPTZ)

### 4.5 `CouponCustomerEligibility`
- `id` (UUID, PK)
- `couponId` (UUID, FK $\rightarrow$ `Coupon`, Cascade)
- `customerId` (UUID, FK $\rightarrow$ `User`, Restrict)
- `createdAt` (TIMESTAMPTZ)

### 4.6 `CouponUsage`
- `id` (UUID, PK)
- `couponId` (UUID, FK $\rightarrow$ `Coupon`, Restrict)
- `salonId` (UUID, FK $\rightarrow$ `Salon`, Restrict)
- `branchId` (UUID, FK $\rightarrow$ `Branch`, Restrict)
- `customerId` (UUID, FK $\rightarrow$ `User`, Restrict)
- `bookingId` (UUID, FK $\rightarrow$ `Booking`, nullable, SetNull)
- `invoiceId` (UUID, FK $\rightarrow$ `Invoice`, nullable, SetNull)
- `discountAmount` (INT - savings applied in currency subunit)
- `bookingTotalBeforeDiscount` (INT)
- `bookingTotalAfterDiscount` (INT)
- `status` (ENUM: `APPLIED`, `SETTLED`, `REVERSED`, `EXPIRED`)
- `appliedAt` (TIMESTAMPTZ)
- `settledAt` (TIMESTAMPTZ, nullable)
- `reversedAt` (TIMESTAMPTZ, nullable)
- `reversalReason` (TEXT, nullable)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

### 4.7 `GiftCard`
- `id` (UUID, PK)
- `giftCardCode` (VARCHAR(32), Unique, e.g. `GC-XXXX-YYYY-ZZZZ`)
- `salonId` (UUID, FK $\rightarrow$ `Salon`, Restrict)
- `purchasedByUserId` (UUID, FK $\rightarrow$ `User`, nullable, SetNull)
- `recipientName` (VARCHAR(100), nullable)
- `recipientEmail` (VARCHAR(255), nullable)
- `recipientPhone` (VARCHAR(20), nullable)
- `personalMessage` (TEXT, nullable)
- `initialBalance` (INT)
- `currentBalance` (INT)
- `currency` (VARCHAR(3), default `INR`)
- `status` (ENUM: `ACTIVE`, `PARTIALLY_REDEEMED`, `FULLY_REDEEMED`, `EXPIRED`, `CANCELLED`, `FROZEN`)
- `expiresAt` (TIMESTAMPTZ)
- `version` (INT, default 1)
- `createdAt`, `updatedAt`, `deletedAt` (TIMESTAMPTZ)

### 4.8 `GiftCardTransaction`
- `id` (UUID, PK)
- `giftCardId` (UUID, FK $\rightarrow$ `GiftCard`, Cascade)
- `bookingId` (UUID, FK $\rightarrow$ `Booking`, nullable, SetNull)
- `invoiceId` (UUID, FK $\rightarrow$ `Invoice`, nullable, SetNull)
- `transactionType` (ENUM: `ISSUE`, `REDEMPTION`, `REFUND_CREDIT`, `EXPIRATION_FORFEIT`, `MANUAL_ADJUSTMENT`)
- `amount` (INT)
- `balanceBefore` (INT)
- `balanceAfter` (INT)
- `notes` (TEXT, nullable)
- `performedByUserId` (UUID, FK $\rightarrow$ `User`, nullable, SetNull)
- `createdAt` (TIMESTAMPTZ)

### 4.9 `FlashSale`
- `id` (UUID, PK)
- `salonId` (UUID, FK $\rightarrow$ `Salon`, Restrict)
- `branchId` (UUID, FK $\rightarrow$ `Branch`, Restrict)
- `serviceId` (UUID, FK $\rightarrow$ `Service`, Restrict)
- `title` (VARCHAR(100))
- `discountPercentage` (DECIMAL(5,2))
- `specialPrice` (INT)
- `startTime` (TIMESTAMPTZ)
- `endTime` (TIMESTAMPTZ)
- `maxSlotQuota` (INT)
- `bookedSlotCount` (INT, default 0)
- `status` (ENUM: `SCHEDULED`, `ACTIVE`, `ENDED`, `CANCELLED`)
- `version` (INT, default 1)
- `createdAt`, `updatedAt`, `deletedAt` (TIMESTAMPTZ)

### 4.10 `MarketingCampaign`
- `id` (UUID, PK)
- `campaignCode` (VARCHAR(32), Unique)
- `salonId` (UUID, FK $\rightarrow$ `Salon`, Restrict)
- `name` (VARCHAR(150))
- `description` (TEXT, nullable)
- `campaignType` (ENUM: `SEASONAL`, `FESTIVAL_SPECIAL`, `WIN_BACK_LAPSED`, `BIRTHDAY_ANNIVERSARY`, `NEW_SERVICE_LAUNCH`, `FLASH_SALE`, `CUSTOM`)
- `couponId` (UUID, FK $\rightarrow$ `Coupon`, nullable, SetNull)
- `targetAudienceSegment` (VARCHAR(50), default `ALL`)
- `channels` (VARCHAR(50)[], default [])
- `budgetLimit` (INT, default 0)
- `actualSpend` (INT, default 0)
- `status` (ENUM: `DRAFT`, `SCHEDULED`, `RUNNING`, `COMPLETED`, `CANCELLED`, `ARCHIVED`)
- `scheduledStartAt` (TIMESTAMPTZ, nullable)
- `scheduledEndAt` (TIMESTAMPTZ, nullable)
- `impressionsCount` (INT, default 0)
- `clicksCount` (INT, default 0)
- `bookingsCount` (INT, default 0)
- `revenueGenerated` (INT, default 0)
- `version` (INT, default 1)
- `createdAt`, `updatedAt`, `deletedAt` (TIMESTAMPTZ)

---

## 5. Security & Concurrency Invariants

1. **Optimistic Locking**: Enforced via `@version Int @default(1)` on `Coupon`, `GiftCard`, `FlashSale`, and `MarketingCampaign`.
2. **Idempotency & Race Protection**:
   - Double-redemption of coupons in concurrent booking checkouts guarded by atomic transaction and quota counter increment.
   - Gift card balance debits guarded with `balanceBefore - amount >= 0` check.
3. **Tenant Boundary Scoping**:
   - All salon-scoped coupons, campaigns, gift cards, and flash sales strictly validate `salonId`.
   - Cross-tenant application or redemption is strictly rejected with `ForbiddenException`.
4. **Soft Deletion**: `deletedAt` on `Coupon`, `GiftCard`, `FlashSale`, and `MarketingCampaign` preserves historical analytics and financial audit trails.
