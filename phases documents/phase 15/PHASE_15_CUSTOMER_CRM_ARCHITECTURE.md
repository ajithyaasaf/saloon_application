# Phase 15.0 — Customer Management & CRM Architecture Blueprint

**Module Name**: `CustomerModule`  
**Document Version**: `v1.1.0` (FROZEN - ENHANCED)  
**Target Release**: Production Multi-Tenant Salon Engine  
**Author**: Lead Principal Systems & Security Architect  

---

## 1. Executive Summary

Phase 15 defines the architectural blueprint for the **Customer Management & CRM Module** of the multi-tenant SaaS salon management platform. The module provides a comprehensive, tenant-isolated customer relationship management engine supporting customer profiles, preference tracking, visit & booking histories, spend analytics, automated loyalty point earning & redemption, dynamic membership plans, customer tagging, notes, referral reward engine, birthday & anniversary tracking, customer merging, blacklisting, and privacy compliance (GDPR/data masking).

### Core Architectural Guarantees
1. **Multi-Tenant Profile Aggregation**: Customers maintain a single underlying identity (`User`), while salon-specific CRM profiles (`CustomerProfile`) isolate visit histories, loyalty points, memberships, and internal notes per salon tenant.
2. **Strict Aggregate Boundaries**: `CustomerProfile` serves as the Aggregate Root. All modifications to preferences, notes, tags, memberships, loyalty points, wallet balances, and referrals strictly execute through `CustomerProfile` aggregate invariants.
3. **Double-Entry Financial & Loyalty Accounting**: Wallet balances (`CustomerWalletLedger`) and loyalty points (`LoyaltyLedger`) are strictly updated through immutable transaction ledgers with optimistic concurrency control (`version`). Direct mutation of balances is forbidden.
4. **Data Privacy & Consent Compliance**: Comprehensive marketing consent history (`CustomerConsentHistory`) tracks changes to email, SMS, and WhatsApp preferences with IP and timestamp telemetry for GDPR auditability.
5. **Deduplication & Lossless Profile Merging**: Duplicate detection based on phone numbers and email addresses with deterministic profile merging recorded in `CustomerMergeHistory`, preserving snapshots, audit trails, and point balances.

---

## 2. Domain Boundaries & Aggregate Root

The **CustomerProfile** aggregate root encapsulates all customer notes, preferences, tags, memberships, loyalty balances, wallet ledgers, referrals, and visit history logs associated with a salon tenant.

```
                                ┌─────────────────────────┐
                                │ CustomerProfile (Root)  │
                                └────────────┬────────────┘
                                             │
      ┌───────────────────┬──────────────────┼───────────────────┬───────────────────┬───────────────────┬───────────────────┐
      ▼                   ▼                  ▼                   ▼                   ▼                   ▼                   ▼
┌──────────────┐  ┌───────────────┐   ┌─────────────┐   ┌─────────────────┐   ┌─────────────┐   ┌─────────────────┐   ┌─────────────┐
│  Customer    │  │   Customer    │   │  Customer   │   │   Customer      │   │  Customer   │   │    Customer     │   │  Customer   │
│ Preference   │  │     Note      │   │     Tag     │   │   Membership    │   │   Loyalty   │   │    Referral     │   │   Wallet    │
└──────────────┘  └───────────────┘   └─────────────┘   └────────┬────────┘   └──────┬──────┘   └─────────────────┘   └──────┬──────┘
      │                   │                  │                   │                   │                                       │
      ▼                   ▼                  ▼                   ▼                   ▼                                       ▼
┌──────────────┐  ┌───────────────┐   ┌─────────────┐   ┌─────────────────┐   ┌─────────────┐                         ┌─────────────┐
│ConsentHistory│  │   NoteAudit   │   │  TagAssign  │   │ MembershipPlan  │   │LoyaltyLedger│                         │WalletLedger │
└──────────────┘  └───────────────┘   └─────────────┘   └─────────────────┘   └─────────────┘                         └─────────────┘
```

### Domain Relationships
- **User (1 : 0..1)**: Linking B2C user account to tenant CRM profile.
- **Salon (N : 1)**: Tenant isolation for customer profiles.
- **Branch (N : 1)**: Primary branch affinity for customer registrations.
- **CustomerPreference & ConsentHistory (1 : 1 & 1 : N)**: Communication consent, preferred staff, preferred services, and GDPR consent audit log.
- **CustomerNote (1 : N)**: Staff and manager internal notes per customer.
- **CustomerTag (N : M)**: Dynamic categorization labels (VIP, High Spender, Frequent Cancellation).
- **MembershipPlan & CustomerMembership (1 : N & 1 : N)**: Reusable salon membership templates and active/historical customer subscriptions.
- **LoyaltyTierDefinition, CustomerLoyalty & LoyaltyLedger (1 : N, 1 : 1 & 1 : N)**: Configurable salon loyalty tier rules, points balance, and immutable point ledger.
- **CustomerWalletLedger (1 : N)**: Double-entry audit ledger for store credits and wallet balances.
- **CustomerReferral (1 : N)**: Referral tracking and reward status.
- **CustomerVisitHistory (1 : N)**: Derived, read-only projection populated automatically from `Booking` $\rightarrow$ `Payment` $\rightarrow$ `Completed` domain events.
- **CustomerMergeHistory (1 : N)**: Audit trail preserving snapshot of merged source profiles.

---

## 3. Customer Status & State Machines

### 3.1 Enums
- **`CustomerStatus`**: `ACTIVE`, `INACTIVE`, `BLOCKED`, `ARCHIVED`.
- **`BlacklistType`**: `NO_SHOW`, `PAYMENT_FRAUD`, `ABUSE`, `STAFF_SAFETY`, `MANUAL`.
- **`MembershipStatus`**: `ACTIVE`, `EXPIRED`, `CANCELLED`, `PAUSED`.
- **`ReferralStatus`**: `PENDING`, `COMPLETED`, `REWARDED`, `EXPIRED`.
- **`LoyaltyTransactionType`**: `EARNED`, `REDEEMED`, `EXPIRED`, `ADJUSTED`.
- **`WalletTransactionType`**: `CREDIT`, `DEBIT`, `EXPIRED`, `ADJUSTED`.
- **`ConsentChannel`**: `EMAIL`, `SMS`, `WHATSAPP`.

### 3.2 Customer Status State Machine Transition Matrix

```
                      ┌──────────┐
                      │  ACTIVE  │
                      └────┬─────┘
           ┌───────────────┼───────────────┐
           │ Inactivity    │ Block         │ Archive
           ▼               ▼               ▼
     ┌───────────┐   ┌───────────┐   ┌───────────┐
     │ INACTIVE  │   │  BLOCKED  │   │ ARCHIVED  │
     └─────┬─────┘   └─────┬─────┘   └───────────┘
           │ Reengage      │ Unblock
           └───────────────┴───────► ACTIVE
```

#### Allowed Customer Status Transitions
- `ACTIVE` $\rightarrow$ `INACTIVE`, `BLOCKED`, `ARCHIVED`
- `INACTIVE` $\rightarrow$ `ACTIVE`, `BLOCKED`, `ARCHIVED`
- `BLOCKED` $\rightarrow$ `ACTIVE`, `ARCHIVED`
- `ARCHIVED` $\rightarrow$ `ACTIVE`

#### Allowed Membership Status Transitions
- `ACTIVE` $\rightarrow$ `PAUSED`, `EXPIRED`, `CANCELLED`
- `PAUSED` $\rightarrow$ `ACTIVE`, `CANCELLED`, `EXPIRED`
- `EXPIRED` $\rightarrow$ `ACTIVE` (Renewed)

---

## 4. Database Entity Model

### 4.1 CustomerProfile Model (Aggregate Root)
| Field | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | String (UUID) | No | Primary Key (`cust_...` format or UUID) |
| `customerCode` | String | No | Unique human-readable code (e.g. `CUST-SAL01-0042`) |
| `userId` | String (UUID) | Yes | Foreign Key to global `User` account |
| `salonId` | String (UUID) | No | Tenant isolation Foreign Key to `Salon` |
| `primaryBranchId` | String (UUID) | No | Primary branch affinity Foreign Key to `Branch` |
| `firstName` | String | No | First name |
| `lastName` | String | No | Last name |
| `email` | String | Yes | Contact email address |
| `phone` | String | No | Contact phone number |
| `gender` | Gender | Yes | Gender preference (`MALE`, `FEMALE`, `OTHER`, `UNSPECIFIED`) |
| `birthDate` | DateTime | Yes | Birthdate for automated birthday offers |
| `anniversaryDate` | DateTime | Yes | Anniversary date for milestone offers |
| `status` | CustomerStatus | No | Current customer state (default: `ACTIVE`) |
| `walletBalance` | Int | No | Store credit balance in minor units (updated ONLY via ledger) |
| `lifetimeSpend` | Int | No | Aggregated spend total in minor units |
| `totalVisits` | Int | No | Aggregated completed appointment count |
| `noShowCount` | Int | No | Aggregated no-show count |
| `cancellationCount` | Int | No | Aggregated cancellation count |
| `lastVisitAt` | DateTime | Yes | Timestamp of most recent completed appointment |
| `isBlacklisted` | Boolean | No | Quick blacklist flag (default: false) |
| `blacklistType` | BlacklistType | Yes | Categorized reason for blacklisting |
| `blacklistReason` | String | Yes | Detailed note on blacklisting |
| `blacklistedAt` | DateTime | Yes | Timestamp when blacklisted |
| `blacklistedByUserId` | String (UUID) | Yes | User who blacklisted customer |
| `version` | Int | No | Optimistic concurrency counter (starts at 1) |
| `createdByUserId` | String (UUID) | No | User who created profile |
| `updatedByUserId` | String (UUID) | Yes | User who last updated profile |
| `createdAt` | DateTime | No | Creation timestamp UTC |
| `updatedAt` | DateTime | No | Last update timestamp UTC |
| `deletedAt` | DateTime | Yes | Soft delete timestamp UTC |

### 4.2 CustomerPreference & ConsentHistory Models
| Field | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | String (UUID) | No | Primary Key |
| `customerProfileId` | String (UUID) | No | Foreign Key to `CustomerProfile` |
| `preferredStaffIds` | String[] | No | Preferred staff IDs |
| `preferredServiceIds` | String[] | No | Preferred service catalog IDs |
| `marketingEmail` | Boolean | No | Marketing email consent (default: true) |
| `marketingSms` | Boolean | No | Marketing SMS consent (default: true) |
| `marketingWhatsapp` | Boolean | No | WhatsApp notification consent (default: true) |
| `patchTestNotes` | String | Yes | Allergen / patch test sensitivity notes |
| `beveragePreference` | String | Yes | In-salon hospitality preferences |
| `updatedAt` | DateTime | No | Last update timestamp UTC |

`CustomerConsentHistory` tracks compliance changes: `id`, `customerProfileId`, `channel` (`ConsentChannel`), `previousValue`, `newValue`, `clientIp`, `userAgent`, `changedByUserId`, `createdAt`.

### 4.3 CustomerNote Model
| Field | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | String (UUID) | No | Primary Key |
| `customerProfileId` | String (UUID) | No | Foreign Key to `CustomerProfile` |
| `branchId` | String (UUID) | No | Branch where note was added |
| `note` | String | No | Note content |
| `isPinned` | Boolean | No | Pin note to top of profile view (default: false) |
| `isPrivate` | Boolean | No | Visible only to managers/owners (default: false) |
| `createdByUserId` | String (UUID) | No | Staff member who wrote note |
| `createdAt` | DateTime | No | Creation timestamp UTC |
| `deletedAt` | DateTime | Yes | Soft delete timestamp UTC |

### 4.4 LoyaltyTierDefinition, CustomerLoyalty & LoyaltyLedger Models
`LoyaltyTierDefinition` allows salon owners to configure tier thresholds dynamically:
`id`, `salonId`, `tierName` (`SILVER`, `GOLD`, `PLATINUM`), `minimumSpend`, `minimumPoints`, `earningMultiplier` (Float), `benefits` (Json), `priority` (Int), `createdAt`, `updatedAt`.

| Field | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | String (UUID) | No | Primary Key |
| `customerProfileId` | String (UUID) | No | Foreign Key to `CustomerProfile` |
| `pointsBalance` | Int | No | Current active points balance |
| `lifetimePointsEarned` | Int | No | Total accumulated lifetime points |
| `currentTier` | String | No | Active tier name derived from `LoyaltyTierDefinition` |
| `version` | Int | No | Optimistic locking counter |
| `updatedAt` | DateTime | No | Last update timestamp UTC |

`LoyaltyLedger` records point changes: `id`, `customerProfileId`, `type` (`LoyaltyTransactionType`), `points`, `previousBalance`, `newBalance`, `referenceType` (`BOOKING`, `MANUAL_ADJUSTMENT`, `EXPIRY`), `referenceId`, `description`, `createdByUserId`, `createdAt`.

### 4.5 MembershipPlan & CustomerMembership Models
`MembershipPlan` separates template plan definitions from customer subscriptions:
`id`, `salonId`, `planCode`, `name`, `description`, `price`, `validityDays`, `discountPercentage`, `benefits` (Json), `isActive`, `createdAt`, `updatedAt`.

| Field | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | String (UUID) | No | Primary Key |
| `customerProfileId` | String (UUID) | No | Foreign Key to `CustomerProfile` |
| `membershipPlanId` | String (UUID) | No | Foreign Key to `MembershipPlan` |
| `status` | MembershipStatus | No | Membership status |
| `startDate` | DateTime | No | Plan activation date |
| `endDate` | DateTime | No | Plan expiry date |
| `pricePaid` | Int | No | Purchase price in minor units |
| `discountPercentage` | Int | No | Service discount percentage |
| `autoRenew` | Boolean | No | Whether plan auto-renews |
| `version` | Int | No | Optimistic locking counter |
| `createdAt` | DateTime | No | Creation timestamp UTC |
| `updatedAt` | DateTime | No | Last update timestamp UTC |

#### Membership Benefit Definitions Supported
- `DISCOUNT_PERCENTAGE`: Service catalog percentage discount.
- `FREE_SERVICES`: Included free service allowances (e.g. 1 monthly haircut).
- `FREE_PRODUCTS`: Included complimentary product perks.
- `PRIORITY_BOOKING`: Early booking window access.
- `BIRTHDAY_GIFT`: Complimentary birthday service credit.
- `EXTRA_LOYALTY_MULTIPLIER`: Loyalty points earning multiplier boost.

### 4.6 CustomerWalletLedger Model
Immutable store credit ledger:
`id`, `customerProfileId`, `type` (`WalletTransactionType`), `amount`, `previousBalance`, `newBalance`, `referenceType` (`PAYMENT_REFUND`, `BOOKING_CANCEL`, `MANUAL_BONUS`), `referenceId`, `description`, `createdByUserId`, `createdAt`.

### 4.7 CustomerMergeHistory Model
Audit trail for profile deduplication:
`id`, `sourceCustomerProfileId`, `targetCustomerProfileId`, `sourceSnapshot` (Json), `mergeReason`, `mergedByUserId`, `mergedAt`.

---

## 5. Feature Architecture Details

### 5.1 Loyalty & Expiry Engine Architecture
- **Automatic Earning**: Listens to `booking.completed.v1` and `payment.completed.v1` events. Points calculated based on salon spending rules and `LoyaltyTierDefinition.earningMultiplier`.
- **Scheduled Expiry Worker (`customers.loyalty_expire`)**: Daily cron job scanning points older than expiry policy $\rightarrow$ writes `LoyaltyLedger` entry (`EXPIRED`) $\rightarrow$ updates `pointsBalance` $\rightarrow$ emits `customer.loyalty.expired.v1` event $\rightarrow$ dispatches notification.

### 5.2 Customer Unified Timeline Architecture
Read-model aggregation endpoint (`GET /api/v1/owner/customers/:id/timeline`) compiling a chronological activity stream:
`Customer Created` $\rightarrow$ `Visited` $\rightarrow$ `Paid` $\rightarrow$ `Membership Purchased` $\rightarrow$ `Referral Rewarded` $\rightarrow$ `Note Added` $\rightarrow$ `Blocked` $\rightarrow$ `Merged`.

---

## 6. Background Queue Jobs (`customers` queue)

1. `customers.loyalty_expire`: Daily scheduled worker processing points expiry.
2. `customers.membership_check`: Daily scheduled worker expiring past-due memberships.
3. `customers.birthday_notifier`: Daily morning job queueing birthday & anniversary greeting notifications.
4. `customers.merge_async`: Asynchronous background task for heavy profile merge operations.

---

## 7. Directory Structure

```
apps/api/src/domains/customer/
├── controllers/
│   ├── customer-public.controller.ts
│   ├── customer-portal.controller.ts
│   ├── customer-owner.controller.ts
│   ├── customer-admin.controller.ts
│   └── tests/
├── services/
│   ├── customer-profile.service.ts
│   ├── customer-loyalty.service.ts
│   ├── customer-membership.service.ts
│   ├── customer-timeline.service.ts
│   ├── customer-merge.service.ts
│   └── tests/
├── repositories/
│   ├── customer-profile.repository.ts
│   ├── customer-loyalty.repository.ts
│   ├── customer-membership.repository.ts
│   ├── customer-wallet.repository.ts
│   ├── customer-note.repository.ts
│   ├── interfaces/
│   └── tests/
├── dto/
│   ├── create-customer-profile.dto.ts
│   ├── update-customer-profile.dto.ts
│   ├── search-customer-query.dto.ts
│   ├── customer-profile.dto.ts
│   ├── customer-timeline.dto.ts
│   ├── customer-loyalty.dto.ts
│   └── customer-membership.dto.ts
├── entities/
│   ├── customer-profile.entity.ts
│   ├── customer-preference.entity.ts
│   ├── customer-note.entity.ts
│   ├── customer-loyalty.entity.ts
│   ├── customer-membership.entity.ts
│   └── customer-wallet-ledger.entity.ts
├── events/
│   ├── customer-created.event.ts
│   ├── customer-updated.event.ts
│   ├── customer-blocked.event.ts
│   ├── customer-note-added.event.ts
│   ├── customer-membership-created.event.ts
│   ├── customer-membership-expired.event.ts
│   ├── customer-loyalty-updated.event.ts
│   ├── customer-loyalty-expired.event.ts
│   └── customer-referral-completed.event.ts
└── customer.module.ts
```

---

## 8. REST API Endpoints

### 8.1 Public Controller (`/api/v1/customer-public`)
- `POST /register-interest` — Public customer interest registration (`@Public()`)

### 8.2 Customer Portal Controller (`/api/v1/customer/profile`)
- `GET /me` — Get current customer's profile, loyalty balance, and active memberships
- `PATCH /me/preferences` — Update communication preferences and consent history
- `GET /me/loyalty/history` — Get customer loyalty points transaction history
- `GET /me/wallet/history` — Get customer wallet credits and transaction ledger
- `GET /me/memberships` — Get active and expired customer memberships

### 8.3 Salon Owner & Manager Controller (`/api/v1/owner/customers`)
- `POST /` — Create new customer profile
- `GET /` — Search salon customers (phone, name, email, spending, tier, tags, branch)
- `GET /:id` — Get comprehensive customer detail (visits, notes, stats)
- `GET /:id/timeline` — Unified chronological customer activity timeline
- `PATCH /:id` — Update customer profile
- `POST /:id/block` — Block/blacklist customer with `BlacklistType`
- `POST /:id/notes` — Add internal staff note to customer profile
- `POST /:id/loyalty/adjust` — Adjust loyalty points balance via `LoyaltyLedger`
- `POST /:id/wallet/adjust` — Adjust wallet balance via `CustomerWalletLedger`
- `POST /:id/membership` — Assign/sell membership plan
- `POST /merge` — Merge two duplicate customer profiles with `CustomerMergeHistory` audit

### 8.4 Admin Controller (`/api/v1/admin/customers`)
- `GET /` — Global multi-tenant customer search
- `DELETE /:id` — GDPR compliant customer data wipe / soft delete

---

## 9. Shared Services Integration & Transaction Governance

### Transaction Execution Order Rule
1. Open DB Transaction (`TransactionService.run`)
2. Update CustomerProfile, WalletLedger, LoyaltyLedger, Membership, or Note entities
3. Write Audit Log (`AuditService.logInTransaction`)
4. Commit Transaction
5. Invalidate Cache (`CacheService.delete`)
6. Publish Domain Events (`EventBusService.publish`)
7. Enqueue Async Jobs (`QueueService.addJob`)
8. Dispatch User Notifications (`NotificationService.send`)

---

## 10. Cache Strategy

- **`CUSTOMER_PROFILE`**: `customer:{id}:profile` (TTL: 1800s)
- **`CUSTOMER_PREFERENCES`**: `customer:{id}:preferences` (TTL: 3600s)
- **`CUSTOMER_LOYALTY`**: `customer:{id}:loyalty` (TTL: 900s)
- **`CUSTOMER_MEMBERSHIP`**: `customer:{id}:membership` (TTL: 1800s)
- **`CUSTOMER_SEARCH`**: `customer:search:{salonId}:{hash}` (TTL: 300s)

---

## 11. Domain Events

- `customer.created.v1`
- `customer.updated.v1`
- `customer.blocked.v1`
- `customer.note-added.v1`
- `customer.membership.created.v1`
- `customer.membership.expired.v1`
- `customer.loyalty.updated.v1`
- `customer.loyalty.expired.v1`
- `customer.referral.completed.v1`

---

## 12. Security & Privacy Audit

- **RBAC**: Guarded by `JwtAuthGuard` and `RolesGuard` (`CUSTOMER`, `SALON_OWNER`, `SUPER_ADMIN`).
- **PII Masking**: Customer phone numbers and email addresses masked in logs and export APIs unless requested by authorized salon manager.
- **GDPR Readiness**: Complete soft-delete & automated erasure workflow for user data removal requests with full `CustomerConsentHistory` tracking.

---

Phase 15.0 Customer Management & CRM Architecture is complete and ready for review.
