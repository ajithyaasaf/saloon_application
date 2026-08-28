# PHASE 13 — BOOKING ENGINE ARCHITECTURE BLUEPRINT

**Document Version**: 1.2.0  
**Status**: FROZEN / AWAITING ARCHITECTURAL REVIEW  
**Module**: `apps/api/src/domains/booking`  
**Frozen Dependencies**: Phase 7 (Auth), Phase 8 (Users), Phase 9 (Common + Shared), Phase 10 (Salon & Branch), Phase 11 (Service Catalog), Phase 12 (Staff Management)  
**Target Dependencies**: Phase 14 (Payment & Invoicing), Phase 16 (Coupons & Promotions), Phase 17 (Reviews & Ratings)

---

## 1. Executive Summary

The Booking Engine is the foundational core transaction domain of the Saloon SaaS platform. It governs appointment scheduling, time slot computation, double-booking prevention, reservation locking, status lifecycles, and booking state transitions across multi-tenant salon networks.

### Core Objectives
1. **Zero Double-Booking Guarantee**: Absolute atomicity using a dual-layer concurrency model (Distributed Redis Lock + PostgreSQL Row-Level Lock with Optimistic Concurrency Control).
2. **High-Performance Availability Calculation**: Sub-50ms slot generation engine capable of evaluating branch hours, staff working shifts, breaks, approved leaves, temporary branch closures, preparation times, cleanup times, and existing appointments.
3. **Resilient Reservation Lifecycle**: Automated 10-minute hold expiration via delay queues (BullMQ) with automated crash-recovery background workers.
4. **Strict Domain Boundaries**: Decoupled integration with payments, coupons, and notifications via versioned domain events (`booking.created.v1`, `booking.confirmed.v1`, etc.).
5. **Multi-Tenant Security & Isolation**: Comprehensive RBAC and tenant ownership verification across Customer, Staff, Salon Owner/Manager, and Super Admin roles.

---

## 2. Domain Boundaries

The Booking Domain maintains strict aggregate boundaries to prevent domain leakage while integrating with surrounding system domains.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 BOOKING AGGREGATE ROOT                  │
                  │  ┌──────────────────┐       ┌────────────────────────┐  │
                  │  │     Booking      │───────│     BookingItem        │  │
                  │  └──────────────────┘ 1   * └────────────────────────┘  │
                  │           │ 1                       │ 1                 │
                  │           ▼ *                       ▼ 1                 │
                  │  ┌──────────────────┐       ┌────────────────────────┐  │
                  │  │BookingStatusHistory      │ BookingReservationLock │  │
                  │  └──────────────────┘       └────────────────────────┘  │
                  └─────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │ Foreign Key Boundary        │ Soft Reference              │ Domain Event
        ▼                             ▼                             ▼
┌───────────────┐             ┌───────────────┐             ┌───────────────┐
│ User (Ph. 8)  │             │Payment (Ph.14)│             │Notification   │
│ Customer      │             │(paymentId)    │             │(Ph. 9 Shared) │
└───────────────┘             └───────────────┘             └───────────────┘
┌───────────────┐             ┌───────────────┐             ┌───────────────┐
│ Salon (Ph.10) │             │Coupon (Ph.16) │             │EventBus       │
│ Branch        │             │(couponCode)   │             │(Ph. 9 Shared) │
└───────────────┘             └───────────────┘             └───────────────┘
┌───────────────┐             ┌───────────────┐
│ Service(Ph.11)│             │Review (Ph.17) │
│ BranchService │             │(reviewId)     │
└───────────────┘             └───────────────┘
┌───────────────┐
│ Staff (Ph.12) │
└───────────────┘
```

### 2.1 Domain Ownership Breakdown

| Entity / Aggregate | Domain Owner | Relationship to Booking Domain |
|---|---|---|
| `Booking` | Booking Domain | **Aggregate Root**. Owns primary schedule, totals, status, customer reference. |
| `BookingItem` | Booking Domain | **Child Entity**. Represents individual services in a multi-service booking. |
| `BookingStatusHistory` | Booking Domain | **Child Entity**. Immutable audit trail of state transitions. |
| `BookingReservationLock` | Booking Domain | **Ephemeral Entity**. Temporary lock for pending checkout slots. |
| `User` (Customer) | User Domain (Phase 8) | Referenced via `customerId` (FK -> `User.id`). |
| `Salon` | Salon Domain (Phase 10) | Referenced via `salonId` (FK -> `Salon.id`). Tenant root. |
| `Branch` | Salon Domain (Phase 10) | Referenced via `branchId` (FK -> `Branch.id`). Operational boundary. |
| `BranchService` | Service Catalog (Phase 11) | Referenced via `branchServiceId` (FK -> `BranchService.id`) in `BookingItem`. |
| `Staff` | Staff Domain (Phase 12) | Referenced via `staffId` (FK -> `Staff.id`) in `BookingItem`. |
| `Payment` | Payment Domain (Phase 14) | Loose coupling via `paymentStatus` enum & nullable `paymentId` (UUID). |
| `Coupon` | Coupon Domain (Phase 16) | Reserved via nullable `couponId` / `couponCode` string. |
| `Review` | Review Domain (Phase 17) | Reserved via nullable `reviewId` (UUID). |

---

## 3. Database Entity Model

All entities follow strict enterprise conventions: UUID primary keys, human-readable booking numbers, explicit soft deletion (`deletedAt`), UTC timestamps, optimistic lock versioning (`version`), and granular audit tracking (`createdBy`, `updatedBy`).

### 3.1 Entity: `Booking` (Aggregate Root)

* **Table**: `bookings`
* **Ownership**: Aggregate Root
* **Soft Delete Policy**: Soft delete via `deletedAt`. Active queries MUST include `WHERE deleted_at IS NULL`.
* **Optimistic Locking**: `version` (integer, incremented on every update).
* **Dual Identifier System**: `id` (UUID PK for database & API relations) + `booking_code` (Unique alphanumeric code e.g. `BK-20260807-X89F`) + `sequence_number` (Per-salon sequential counter e.g. `#1042`).

```sql
CREATE TYPE booking_status_enum AS ENUM (
    'PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED', 'FAILED'
);

CREATE TYPE payment_status_enum AS ENUM (
    'UNPAID', 'PENDING', 'AUTHORIZED', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED'
);

CREATE TYPE walk_in_type_enum AS ENUM (
    'NONE', 'EXISTING_CUSTOMER', 'NEW_CUSTOMER', 'ANONYMOUS_GUEST'
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(32) NOT NULL UNIQUE, -- e.g., BK-20260807-X89F
    sequence_number BIGINT NOT NULL, -- Per-salon sequential number for receipts/POS
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Walk-in Tracking
    walk_in_type walk_in_type_enum NOT NULL DEFAULT 'NONE',
    is_walk_in BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Status & Lifecycle
    status booking_status_enum NOT NULL DEFAULT 'PENDING',
    payment_status payment_status_enum NOT NULL DEFAULT 'UNPAID',
    cancellation_reason TEXT NULL,
    cancelled_by_user_id UUID NULL REFERENCES users(id),
    cancelled_at TIMESTAMPTZ NULL,
    reschedule_count INT NOT NULL DEFAULT 0,
    
    -- Schedule Boundaries (Aggregate start/end across all items)
    booking_date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    total_duration_minutes INT NOT NULL,
    
    -- Pricing Breakdown (Stored in minor currency units / integer cents)
    subtotal_amount INT NOT NULL DEFAULT 0,
    tax_amount INT NOT NULL DEFAULT 0,
    discount_amount INT NOT NULL DEFAULT 0,
    total_amount INT NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    -- External Domain References (Reserved / Soft FKs)
    payment_id UUID NULL, -- Phase 14
    coupon_id UUID NULL,  -- Phase 16
    review_id UUID NULL,  -- Phase 17
    
    -- Metadata & Client Info
    notes TEXT NULL,
    internal_notes TEXT NULL,
    client_ip VARCHAR(45) NULL,
    user_agent TEXT NULL,
    
    -- Audit & Concurrency
    version INT NOT NULL DEFAULT 1,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    updated_by_user_id UUID NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT uq_salon_sequence UNIQUE (salon_id, sequence_number)
);
```

### 3.2 Entity: `BookingItem`

* **Table**: `booking_items`
* **Ownership**: Child entity of `Booking`.
* **Optimistic Locking & Granular Audit**: Contains independent `version`, `created_by_user_id`, and `updated_by_user_id` to support individual service/staff line item edits post-booking creation.

```sql
CREATE TABLE booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    branch_service_id UUID NOT NULL REFERENCES branch_services(id) ON DELETE RESTRICT,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
    
    -- Item Execution Sequence
    sequence_order INT NOT NULL DEFAULT 1,
    
    -- Time Breakdown
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    service_duration_minutes INT NOT NULL,
    prep_time_minutes INT NOT NULL DEFAULT 0,
    cleanup_time_minutes INT NOT NULL DEFAULT 0,
    buffer_time_minutes INT NOT NULL DEFAULT 0,
    
    -- Price Breakdown
    unit_price INT NOT NULL DEFAULT 0,
    discount_amount INT NOT NULL DEFAULT 0,
    final_price INT NOT NULL DEFAULT 0,
    
    -- Status Override
    status booking_status_enum NOT NULL DEFAULT 'PENDING',
    
    -- Audit & Concurrency
    version INT NOT NULL DEFAULT 1,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    updated_by_user_id UUID NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ NULL
);
```

### 3.3 Entity: `BookingStatusHistory`

```sql
CREATE TABLE booking_status_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    from_status booking_status_enum NULL,
    to_status booking_status_enum NOT NULL,
    reason TEXT NULL,
    performed_by_user_id UUID NOT NULL REFERENCES users(id),
    actor_role VARCHAR(32) NOT NULL, -- CUSTOMER | STAFF | SALON_OWNER | ADMIN | SYSTEM
    metadata JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4 Entity: `BookingReservationLock`

```sql
CREATE TABLE booking_reservation_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lock_key VARCHAR(128) NOT NULL UNIQUE, -- branch:{id}:staff:{id}:date:{date}:slot:{time}
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(64) NULL, -- Identifies active browser/device checkout session
    booking_id UUID NULL REFERENCES bookings(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_count INT NOT NULL DEFAULT 0, -- Max 1 refresh (+5m extension)
    is_released BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Booking Status Lifecycle & Payment States

### 4.1 State Machine Transition Matrix

```
                    ┌────────────────────────┐
                    │        PENDING         │
                    └────────────────────────┘
                      │          │         │
           Payment    │          │         │ Timeout (10 min) /
           Confirmed  │          │         │ Customer Cancel /
                      ▼          │         │ Payment Failed
            ┌───────────┐        │         ▼
            │ CONFIRMED │        │    ┌──────────┐
            └───────────┘        │    │ EXPIRED  │ / ┌──────────┐
              │       │          │    └──────────┘   │  FAILED  │
    Check In  │       │ Cancel   │                   └──────────┘
              ▼       └──────────┼───────────────┐
       ┌────────────┐            │               │
       │ CHECKED_IN │            ▼               ▼
       └────────────┘      ┌───────────┐   ┌──────────┐
              │            │ CANCELLED │   │ NO_SHOW  │
      Start   │            └───────────┘   └──────────┘
      Service ▼                  ▲
       ┌─────────────┐           │
       │ IN_PROGRESS │───────────┘
       └─────────────┘  Emergency
              │         Cancel
     Complete │
              ▼
       ┌───────────┐
       │ COMPLETED │
       └───────────┘
```

| From State | To State | Allowed Actor(s) | Trigger / Condition | System Side Effects |
|---|---|---|---|---|
| `* (Initial)` | `PENDING` | Customer, Staff, Owner | Checkout initiated; slot reserved for 10 min | Reserve slot, start BullMQ expiration timer |
| `PENDING` | `CONFIRMED` | System, Staff, Owner | Payment authorized/settled OR manual bypass (walk-in) | Cancel expiration timer, send confirmation SMS/Email |
| `PENDING` | `EXPIRED` | System (BullMQ / Recovery) | 10-minute reservation timer elapsed without payment | Release slot reservation lock, emit `booking.expired.v1` |
| `PENDING` | `FAILED` | System, Customer | Payment gateway error or explicit payment drop | Release slot lock, emit `booking.failed.v1` |
| `PENDING` | `CANCELLED` | Customer, Owner, Admin | Manual drop before payment | Release lock, record status history |
| `CONFIRMED` | `CHECKED_IN` | Staff, Owner, Admin | Customer arrives at branch | Update `checkedInAt`, emit `booking.checked-in.v1` |
| `CONFIRMED` | `CANCELLED` | Customer, Owner, Admin | Cancelled within allowable policy window | Process refund policy, invalidate schedule cache, emit `booking.cancelled.v1` |
| `CONFIRMED` | `NO_SHOW` | Staff, Owner, Admin | Customer failed to arrive within branch grace period | Emit `booking.no-show.v1`, notify customer |
| `CHECKED_IN` | `IN_PROGRESS` | Staff, Owner | Service execution started | Record actual start time, emit `booking.in-progress.v1` |
| `IN_PROGRESS` | `COMPLETED` | Staff, Owner | All service items finished | Record actual end time, emit `booking.completed.v1`, trigger Review prompt (Phase 17) |
| `IN_PROGRESS` | `CANCELLED` | Owner, Admin | Emergency abortion during execution | Record partial completion reason, issue manual refund |

### 4.2 Reserved Payment States (Phase 14 Integration Contract)

| Payment State | Description | Transition Trigger |
|---|---|---|
| `UNPAID` | Initial state upon booking creation for online bookings. | Booking created without immediate payment capture. |
| `PENDING` | Payment transaction initiated at gateway (Razorpay/Stripe). | Customer redirected to payment gateway. |
| `AUTHORIZED` | Payment pre-authorized / held on card. | Card authorization webhook received. |
| `PAID` | Payment captured and settled in full. | Success webhook / POS cash collection. |
| `PARTIALLY_REFUNDED` | Partial refund processed following late cancellation. | Partial refund API call completed. |
| `REFUNDED` | Full refund issued to customer. | Full refund webhook / manual refund executed. |
| `FAILED` | Payment transaction rejected or declined. | Failed webhook / payment timeout. |

---

## 5. Walk-In Architecture & Creation Flows

Walk-in bookings are initiated by Salon Staff or Managers via the POS interface. Walk-in architecture accounts for 4 distinct customer onboarding modes.

```
                           Walk-In Request Initiated at POS
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
          Has Phone / Email?                              No Contact Info
                   │                                             │
      ┌────────────┴────────────┐                                ▼
      ▼                         ▼                      ANONYMOUS GUEST
Existing Customer         New Customer                 Assign to System Guest
Link to User (Ph. 8)      Auto-Create User (Ph. 8)     User Record per Salon
                          (Role: CUSTOMER, Temp PW)    ("Guest Customer")
```

### 5.1 Walk-In Onboarding Types & Linking Rules

1. **Existing Customer Walk-In**:
   - Staff enters Customer Phone / Email at POS.
   - API performs lookup against `User` table (Phase 8).
   - If found, `booking.customer_id = User.id` and `walk_in_type = EXISTING_CUSTOMER`.
2. **New Customer Walk-In**:
   - Phone/Email not found in database.
   - System automatically provisions a minimal `User` record with role `CUSTOMER`, sets `isPhoneVerified = false`, and dispatches welcome SMS with account completion link.
   - `booking.customer_id = new_user.id` and `walk_in_type = NEW_CUSTOMER`.
3. **Anonymous Walk-In**:
   - Customer declines to provide contact information.
   - System maps booking to the salon's designated fallback `GuestUser` record (`salon.guest_user_id`).
   - `booking.customer_id = guest_user.id` and `walk_in_type = ANONYMOUS_GUEST`.
4. **Phone Deduplication Linking Rule**:
   - Phone numbers are normalized to E.164 format (`+91XXXXXXXXXX`).
   - Concurrent walk-in creations with identical phone numbers resolve to the single master `User` record using `INSERT ... ON CONFLICT (phone) DO UPDATE`.

### 5.2 Offline Booking Policy (POS Resilience)

Salons experiencing internet connectivity drops follow an **Optimistic Offline Queuing Policy**:

1. **Local Queueing**: POS web app queues walk-in creation payloads in IndexedDB (`offline_booking_queue`).
2. **Offline Local Slot Allocation**: POS marks staff occupied locally to prevent local double-booking.
3. **Re-connection Sync**: Upon network restoration, POS flushes queued walk-in requests sequentially with header `X-Offline-Created-At`.
4. **Conflict Resolution Rules**:
   - If offline walk-in collides with a remote online booking made during outage:
     - **Walk-In Priority Rule**: Physical in-salon walk-in receives operational priority.
     - Online booking is flagged for **Automated Emergency Reschedule / Re-assignment** by `BookingService`.
     - Alert published to `AuditService` (`OFFLINE_BOOKING_CONFLICT_RESOLVED`).

---

## 6. Time Slot Architecture & Overlap Rules

### 6.1 Authoritative Overlap Predicate

Two time intervals $[A_{start}, A_{end})$ and $[B_{start}, B_{end})$ overlap if and only if:

$$\text{Overlap} \iff \text{existing.start\_time} < \text{requested.end\_time} \land \text{requested.start\_time} < \text{existing.end\_time}$$

This mathematical formula is the single frozen authoritative check for all conflict detectors in the platform.

### 6.2 Holiday & Operational Precedence Hierarchy

When computing schedule availability, conflicting rules are resolved according to strict priority order (highest priority override to lowest):

$$\text{Branch Holiday} \succ \text{Temporary Closure} \succ \text{Staff Approved Leave} \succ \text{Staff Shift Breaks} \succ \text{Standard Branch Hours}$$

1. **Level 1 — Branch Holiday**: Branch is completely closed. No slots generated regardless of staff shifts.
2. **Level 2 — Temporary Closure**: Branch closed for specified time window (ad-hoc maintenance/renovation).
3. **Level 3 — Staff Approved Leave**: Staff member unavailable (`StaffLeave` record in Phase 12).
4. **Level 4 — Staff Shift Breaks**: Scheduled staff lunch/rest breaks.
5. **Level 5 — Standard Branch Hours**: Default operational opening/closing window.

### 6.3 Daylight Saving Time (DST) & Timezone Rules

All timestamps are stored in UTC (`TIMESTAMPTZ`). Local schedule calculations convert UTC boundaries into `Branch.timezone` (IANA identifier e.g. `America/New_York`, `Europe/London`).

#### DST Transition Edge Cases & Resolutions

1. **Spring Forward (Skipped Hour — e.g. 2:00 AM -> 3:00 AM)**:
   - Local times falling within the non-existent skipped hour (e.g. 2:30 AM) are **INVALID**.
   - Availability Engine automatically rejects slot generation in skipped local hours.
2. **Fall Back (Ambiguous Hour — e.g. 1:00 AM occurs twice)**:
   - Local times occurring during duplicate hours are resolved unambiguously using UTC offsets stored in candidate slots (e.g. `2026-11-01T01:30:00-04:00` vs `2026-11-01T01:30:00-05:00`).

---

## 7. Availability Engine Submodule Architecture

To ensure clean code separation and long-term maintainability, the `AvailabilityEngineModule` is decomposed into 6 explicit submodules:

```
AvailabilityEngineModule
├── ShiftCalculator      (Calculates effective staff working windows per day)
├── LeaveValidator       (Evaluates staff leaves, branch holidays & temp closures)
├── SlotGenerator        (Generates candidate time slot grids given service duration)
├── ConflictDetector     (Executes authoritative overlap check against bookings & locks)
├── StaffAllocator       (Executes 5-tier staff auto-assignment tie-breaker algorithm)
└── TimezoneConverter    (Handles UTC <-> IANA Branch Timezone transformations)
```

### 7.1 Staff Auto-Assignment Algorithm

When a customer selects `ANY_AVAILABLE` for staff, `StaffAllocator` assigns staff using a 5-tier deterministic priority algorithm:

1. **Tier 1 — Preferred Stylist**: Match customer's explicitly preferred staff (if specified in request or customer history).
2. **Tier 2 — Skill Priority**: Select staff with highest skill tier for requested service (`BranchServiceStaff.skill_level`).
3. **Tier 3 — Lowest Utilization %**: Select staff with lowest booked workload percentage for the day ($\frac{\text{Booked Minutes}}{\text{Total Shift Minutes}} \times 100$).
4. **Tier 4 — Round-Robin Fallback**: Break ties using least-recently-booked timestamp (`staff.last_booked_at ASC`).
5. **Tier 5 — Manual POS Override**: Salon staff may explicitly override auto-assignment at POS.

---

## 8. Concurrency, Lock Ownership & Queue Policies

### 8.1 Concurrent Payment Webhook vs Expiration Race Condition

When a BullMQ 10-minute reservation expiration worker and a Payment Gateway confirmation webhook fire simultaneously:

```
             Simultaneous Event Trigger (Expiration Worker vs Payment Webhook)
                                            │
                                            ▼
                           Pessimistic Row Lock on Booking
                           SELECT * FROM bookings WHERE id = $id FOR UPDATE
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
    Payment Webhook Acquired First                         Expiration Worker Acquired First
               │                                                         │
               ▼                                                         ▼
 1. Status set to CONFIRMED                               1. Status set to EXPIRED
 2. BullMQ job cancelled                                  2. Lock released
 3. Slot permanently booked!                                             │
                                                          ▼
                                            Payment Webhook Arrives Later
                                                          │
                                                          ▼
                                            Inspect Slot Availability:
                                            ├── Lock Still Free ──► Re-confirm (EXPIRED -> CONFIRMED)
                                            └── Slot Taken ──► Auto Refund via Gateway (Phase 14)
```

### 8.2 BullMQ Queue Retry & Dead-Letter Queue (DLQ) Policy

For `booking-expiration-queue` jobs:
* **Max Attempts**: 3
* **Backoff Strategy**: Exponential backoff (`1000ms`, `5000ms`, `15000ms`).
* **Dead-Letter Queue (DLQ)**: Failed jobs after 3 retries are moved to `booking-expiration-dlq`. Alerts dispatched to SRE / System Monitoring.

---

## 9. Booking Modification & Calendar Strategy

### 9.1 Salon Owner Calendar Query Strategy

To ensure zero-lag rendering of high-density salon calendar views (e.g. 50 staff columns across a 7-day range), calendar queries avoid dynamic runtime joins by using a optimized composite query pattern:

```typescript
export interface CalendarQueryDto {
  branchId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  staffIds?: string[];
  statuses?: BookingStatus[];
}

// Executed against optimized composite index idx_bookings_branch_date_status
```

---

## 10. Audit Events & Availability Cache Invalidation Triggers

### 10.1 Master Availability Cache Invalidation Triggers

The Redis availability cache (`branch:{id}:avail:{date}:...`) is immediately invalidated upon any of the following system events:

1. `booking.created.v1`
2. `booking.cancelled.v1`
3. `booking.rescheduled.v1`
4. `booking.expired.v1`
5. `staff.leave.approved.v1` (Phase 12)
6. `staff.schedule.updated.v1` (Phase 12)
7. `branch.holiday.updated.v1` (Phase 10)
8. `branch.closure.created.v1` (Phase 10)

---

## 11. Shared Services Integration

The Booking Module consumes shared cross-cutting services defined in Phase 9:

```
                                  ┌────────────────────────┐
                                  │     BookingModule      │
                                  └────────────────────────┘
                                               │
     ┌──────────────────┬──────────────────────┼──────────────────────┬──────────────────┐
     ▼                  ▼                      ▼                      ▼                  ▼
┌──────────────┐  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐   ┌──────────────┐
│TransactionSvc│  │ AuditService │      │ CacheService │      │ QueueService │   │ EventBusSvc  │
│(Phase 9)     │  │ (Phase 9)    │      │ (Phase 9)    │      │ (Phase 9)    │   │ (Phase 9)    │
└──────────────┘  └──────────────┘      └──────────────┘      └──────────────┘   └──────────────┘
  Atomic DB         Immutable            Redis caching         BullMQ delays      Domain Event
  Transactions      Audit Logs           & Slot Locks          for Expiration     Broadcasting
```

---

## 12. Booking Code & Numbering Architecture

System generates dual identifiers for every booking:

1. **Primary Key**: `id` (UUID v4) for foreign keys and API internal routing.
2. **Global Alphanumeric Booking Code**: `booking_code` (`BK-YYYYMMDD-XXXX` e.g. `BK-20260807-A92F`).
3. **Salon Sequence Number**: `sequence_number` (Per-salon sequential bigint e.g. `#1042`).

---

## 13. Domain Events Catalog

Versioned events emitted via `EventBusService`:

1. `booking.created.v1`
2. `booking.confirmed.v1`
3. `booking.cancelled.v1`
4. `booking.completed.v1`
5. `booking.no-show.v1`
6. `booking.rescheduled.v1`
7. `booking.checked-in.v1`
8. `booking.in-progress.v1`
9. `booking.expired.v1`

---

## 14. Performance Strategy & Computational Complexity SLA

$$\text{Time Complexity}: O(S \times T \times B)$$
Where $S = \text{Eligible Staff Count}$, $T = \text{Candidate Time Slots}$, $B = \text{Existing Bookings on Date}$.

* **Single Branch Availability Query SLA**: $< 50\text{ms}$ (p95).
* **Multi-Service Combination Query SLA**: $< 100\text{ms}$ (p95).
* **System Capacity Target**: Tested up to **500 active staff** and **5,000 bookings/day per branch**.

---

## 15. Technical Debt Register

1. **Group / Party Bookings**: Deferred to Phase 15. MVP supports 1 customer per booking aggregate.
2. **Recurring Appointments**: Deferred to Phase 15. MVP supports single discrete appointments.
3. **Dynamic Buffer Extensions**: Service buffer times are fixed per service definition in Phase 11. Custom per-staff buffer extensions deferred to Phase 15.

---

## 16. Production Readiness Checklist

- [x] Zero double-booking concurrency architecture documented.
- [x] Walk-in booking architecture & customer linking rules frozen.
- [x] 5-tier staff auto-assignment tie-breaker algorithm defined.
- [x] Timezone & DST (Spring forward / Fall back) handling frozen.
- [x] Dual identifier (UUID + `BK-YYYYMMDD-XXXX`) generation algorithm specified.
- [x] Authoritative overlap predicate formula frozen.
- [x] Availability engine decomposed into 6 submodules (`ShiftCalculator`, `LeaveValidator`, etc.).
- [x] Master 8-event availability cache invalidation trigger list frozen.
- [x] Payment Webhook vs Expiration Worker race condition priority rule established.
- [x] Queue retry policy (3 attempts, exponential backoff, DLQ) specified.
- [x] Target folder tree completely mapped.
- [x] Permanent architecture frozen declaration included.

---

## 17. Freeze Declaration

**PHASE 13.0 ARCHITECTURE IS HEREBY FROZEN.**

Execution MUST STOP. No Prisma schema definitions, NestJS modules, controllers, services, DTOs, or tests shall be generated until formal architectural review and sign-off of `PHASE_13_BOOKING_ENGINE_ARCHITECTURE.md`.
