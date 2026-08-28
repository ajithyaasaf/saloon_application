# PHASE 12 — STAFF MANAGEMENT MODULE ARCHITECTURE

**Status**: AWAITING APPROVAL  
**Frozen References**: Phase 7 (Auth), Phase 8 (Users), Phase 9 (Common + Shared), Phase 10 (Salon), Phase 11 (Service Catalog)

---

## 1. Executive Summary

The Staff Management Module is the employment backbone of the saloon platform.  
It governs the full lifecycle of a salon employee — from invitation through termination — and exposes the staff availability, scheduling, and service assignment data consumed by the upcoming Booking Module (Phase 13).

**Key responsibilities:**
- Staff profile ownership and employment status lifecycle (including secure token-based invitation expiration).
- Multi-branch assignment management.
- Per-branch working schedule and break-time management.
- Leave request, approval, and availability blocking.
- Service capability assignment (linking staff to ServiceCatalog offerings).
- Read model exposure to Booking Module for slot computation.

**What it does NOT own:**
- Authentication tokens (Phase 7).
- User account records (Phase 8).
- Salon/Branch records (Phase 10).
- Service definitions (Phase 11).
- Appointment/Booking records (Phase 13).

---

## 2. Aggregate Design

### 2.1 Aggregate Root — Staff

```
Staff (Aggregate Root)
├── id                         UUID, PK
├── userId                     FK → User (Phase 8) — null until invitation accepted
├── salonId                    FK → Salon (Phase 10)
├── employeeCode               string, unique within salon (auto-generated)
├── displayName                string
├── role                       enum: RECEPTIONIST | STYLIST | THERAPIST | MANAGER | OWNER_STAFF
├── customRoleId               UUID? (FK → future SalonRole entity for custom roles)
├── bio                        string? (public facing)
├── avatarMediaId              UUID? (FK → future Media)
├── employmentStatus           enum (lifecycle — see §2.2)
├── invitationExpiresAt        DateTime? (default 7 days from invitation)
├── joinedAt                   DateTime?
├── terminatedAt               DateTime?
├── version                    int (optimistic locking)
├── createdAt                  DateTime
├── updatedAt                  DateTime
└── deletedAt                  DateTime? (soft delete)
```

> **Role Extension Architecture Note**:  
> For Phase 12 MVP, staff roles use the native `StaffRole` enum (`RECEPTIONIST`, `STYLIST`, `THERAPIST`, `MANAGER`, `OWNER_STAFF`).  
> A nullable `customRoleId` column is reserved in the aggregate schema. In Phase 15 (Enterprise Extensions), salons will be able to define custom roles (e.g. Barber, Hair Artist, Nail Artist, Color Specialist) without requiring DDL alterations or breaking changes to existing endpoints.

---

### 2.2 Employment Status Lifecycle & Invitation Token Security

**States:**

| State | Description |
|---|---|
| `INVITED` | Invitation sent with secure single-use token, user not yet registered |
| `EXPIRED` | Invitation token passed 7-day expiration threshold without acceptance |
| `ACTIVE` | Fully onboarded, working, bookable |
| `INACTIVE` | Temporarily inactive, not bookable |
| `SUSPENDED` | Administratively suspended pending investigation |
| `TERMINATED` | Employment ended, historical record retained |
| `ARCHIVED` | Soft-deleted from active view |

**Legal State Transitions:**

```
INVITED       ──→  ACTIVE     (valid invitation token accepted)
INVITED       ──→  EXPIRED    (7-day timeout auto-transition / resendable)
INVITED       ──→  ARCHIVED   (invitation withdrawn)
EXPIRED       ──→  INVITED   (owner resends invitation — generates new tokenHash)
EXPIRED       ──→  ARCHIVED   (invitation cancelled)
ACTIVE        ──→  INACTIVE
ACTIVE        ──→  SUSPENDED
ACTIVE        ──→  TERMINATED
INACTIVE      ──→  ACTIVE
INACTIVE      ──→  TERMINATED
SUSPENDED     ──→  ACTIVE     (reinstatement)
SUSPENDED     ──→  TERMINATED
TERMINATED    ──→  ARCHIVED   (only allowed transition out)
```

#### Secure StaffInvitationToken Entity

```
StaffInvitationToken
├── id               UUID, PK
├── staffId          FK → Staff
├── tokenHash        string (SHA-256 hash of raw cryptographically secure token)
├── expiresAt        DateTime (default 7 days from creation)
├── usedAt           DateTime? (null until accepted)
└── createdAt        DateTime
```

#### Token-Based Invitation Flow:
1. **Owner invites staff** (`POST /api/v1/owner/staff`):
   - System creates `Staff` record in `INVITED` state.
   - Generates 32-byte cryptographically secure random raw token.
   - Hashes raw token with SHA-256 and stores `StaffInvitationToken` with `expiresAt = NOW() + 7 days`.
   - Sends raw token in Email/SMS invitation URL (e.g., `https://app.saloon.com/accept-invite?token=RAW_TOKEN`).
2. **Staff accepts invitation** (`POST /api/v1/staff/accept-invitation`):
   - Computes SHA-256 hash of submitted `rawToken`.
   - Queries `StaffInvitationToken` matching `tokenHash`.
   - Validates `usedAt IS NULL` and `expiresAt > NOW()`.
   - Marks token as `usedAt = NOW()`.
   - Connects linked `userId` (from Phase 8 User onboarding/auth).
   - Transitions `Staff.employmentStatus` to `ACTIVE`.
3. **Resend Expiration Handling**:
   - Resending invitation invalidates prior unused tokens for that `staffId` and generates a fresh `StaffInvitationToken`.

---

### 2.3 StaffBranchAssignment

```
StaffBranchAssignment
├── id          UUID, PK
├── staffId     FK → Staff
├── branchId    FK → Branch (Phase 10)
├── isPrimary   boolean (exactly one per staff must be true)
├── startDate   Date
├── endDate     Date? (null = ongoing)
├── isActive    boolean
├── version     int
└── createdAt / updatedAt / deletedAt
```

**Invariants:**
- Exactly one assignment per staff must have `isPrimary = true`.
- Overlapping date ranges for same staff+branch are forbidden.
- Deactivation sets `isActive = false`, does not delete.

---

### 2.4 StaffServiceAssignment

```
StaffServiceAssignment
├── id              UUID, PK
├── staffId         FK → Staff
├── branchServiceId FK → BranchService (Phase 11)
├── isActive        boolean
├── assignedAt      DateTime
└── createdAt / updatedAt / deletedAt
```

**Invariants:**
- A staff member can only be assigned to a `BranchService` of a branch they are actively assigned to.
- Duplicate `(staffId, branchServiceId)` forbidden.

---

### 2.5 StaffWorkingHours

```
StaffWorkingHours
├── id              UUID, PK
├── staffId         FK → Staff
├── branchId        FK → Branch
├── dayOfWeek       enum: MON | TUE | WED | THU | FRI | SAT | SUN
├── startTime       Time (HH:MM)
├── endTime         Time (HH:MM)
├── isActive        boolean
├── effectiveFrom   Date
├── effectiveUntil  Date? (null = permanent)
├── breaks          JSON: [{ start: HH:MM, end: HH:MM }]
├── version         int
└── createdAt / updatedAt / deletedAt
```

> **Break Storage Architecture Note**:  
> Breaks are stored as an inline JSON array for Phase 12 MVP (`[{ start: "12:00", end: "13:00" }]`) for low-latency retrieval.  
> If enterprise analytics/reporting require direct relational indexing in Phase 15, a 1:N `StaffBreak` sub-entity can be extracted without modifying the `StaffWorkingHours` root identity.

**Invariants:**
- `startTime` < `endTime`.
- Break intervals must fall within `[startTime, endTime]`.
- Duplicate `(staffId, branchId, dayOfWeek)` with overlapping effectiveDates forbidden.

---

### 2.6 StaffLeave

```
StaffLeave
├── id               UUID, PK
├── staffId          FK → Staff
├── leaveType        enum: SICK | CASUAL | ANNUAL | EMERGENCY | HALF_DAY | CUSTOM
├── startDate        Date
├── endDate          Date
├── halfDayPeriod    enum? MORNING | AFTERNOON
├── reason           string?
├── status           enum: PENDING | APPROVED | REJECTED | CANCELLED
├── approvedById     UUID? (FK → Staff / User)
├── approvedAt       DateTime?
├── rejectionReason  string?
├── isBookingBlocked boolean (auto-true on approval)
├── version          int
└── createdAt / updatedAt / deletedAt
```

**Invariants:**
- `startDate` <= `endDate`.
- `HALF_DAY` leaves must have `startDate == endDate`.
- Overlapping approved leaves for same staff are forbidden.
- Approved leave blocks all booking slots in that date range.

---

## 3. Domain Responsibilities

| Concern | Owner Module |
|---|---|
| Staff profile CRUD & Employee Code auto-generation | **Staff Module** |
| Secure Token-Based Employment Lifecycle & Invitation Expiry | **Staff Module** |
| Branch assignment | **Staff Module** (references Phase 10 Branch) |
| Service capability assignment | **Staff Module** (references Phase 11 BranchService) |
| Working schedule management | **Staff Module** |
| Leave request and approval | **Staff Module** |
| Booking availability computation | **Booking Module** (Phase 13) — reads Staff Module |
| Appointment creation | **Booking Module** (Phase 13) |
| Salon/Branch creation | **Salon Module** (Phase 10) |
| User account management | **User Module** (Phase 8) |
| Authentication tokens | **Auth Module** (Phase 7) |

---

## 4. Folder Structure

```
src/domains/staff/

├── controllers/
│   ├── staff-public.controller.ts
│   ├── staff-owner.controller.ts
│   ├── staff-self.controller.ts
│   ├── staff-admin.controller.ts
│   └── tests/
│       ├── staff-public.controller.spec.ts
│       ├── staff-owner.controller.spec.ts
│       ├── staff-self.controller.spec.ts
│       └── staff-admin.controller.spec.ts

├── services/
│   ├── staff.service.ts
│   ├── branch-assignment.service.ts
│   ├── working-schedule.service.ts
│   ├── leave.service.ts
│   └── tests/
│       ├── staff.service.spec.ts
│       ├── branch-assignment.service.spec.ts
│       ├── working-schedule.service.spec.ts
│       └── leave.service.spec.ts

├── repositories/
│   ├── staff.repository.ts
│   ├── staff-invitation-token.repository.ts
│   ├── staff-assignment.repository.ts
│   ├── staff-schedule.repository.ts
│   ├── staff-leave.repository.ts
│   └── tests/
│       ├── staff.repository.spec.ts
│       ├── staff-invitation-token.repository.spec.ts
│       ├── staff-assignment.repository.spec.ts
│       ├── staff-schedule.repository.spec.ts
│       └── staff-leave.repository.spec.ts

├── dto/
│   ├── create-staff.dto.ts
│   ├── accept-staff-invitation.dto.ts
│   ├── update-staff.dto.ts
│   ├── create-branch-assignment.dto.ts
│   ├── update-branch-assignment.dto.ts
│   ├── create-service-assignment.dto.ts
│   ├── create-working-hours.dto.ts
│   ├── update-working-hours.dto.ts
│   ├── create-leave.dto.ts
│   ├── reject-leave.dto.ts
│   ├── search-staff-query.dto.ts
│   ├── staff-availability-query.dto.ts
│   ├── staff.dto.ts
│   ├── staff-detail.dto.ts
│   ├── staff-branch-assignment.dto.ts
│   ├── staff-service-assignment.dto.ts
│   ├── staff-working-hours.dto.ts
│   ├── staff-schedule-summary.dto.ts
│   ├── staff-leave.dto.ts
│   ├── staff-availability.dto.ts
│   └── paginated-staff.dto.ts

├── entities/
│   ├── staff.entity.ts
│   ├── staff-invitation-token.entity.ts
│   ├── staff-branch-assignment.entity.ts
│   ├── staff-service-assignment.entity.ts
│   ├── staff-working-hours.entity.ts
│   └── staff-leave.entity.ts

├── events/
│   ├── staff-invited.event.ts
│   ├── staff-invitation-accepted.event.ts
│   ├── staff-created.event.ts
│   ├── staff-updated.event.ts
│   ├── staff-status-changed.event.ts
│   ├── staff-branch-assigned.event.ts
│   ├── staff-branch-unassigned.event.ts
│   ├── staff-service-assigned.event.ts
│   ├── staff-service-unassigned.event.ts
│   ├── staff-leave-requested.event.ts
│   ├── staff-leave-approved.event.ts
│   ├── staff-leave-rejected.event.ts
│   ├── staff-suspended.event.ts
│   └── staff-terminated.event.ts

└── staff.module.ts
```

---

## 5. Service Design

### 5.1 StaffService

| Method | Responsibility |
|---|---|
| `createStaff(dto, actorId)` | Create staff in `INVITED` state, auto-generate `employeeCode` (`EMP001`), generate raw token + `StaffInvitationToken` (`tokenHash`), publish `staff.invited.v1` |
| `acceptInvitation(dto)` | Hash raw token, find matching valid `StaffInvitationToken`, link `userId`, set `usedAt`, transition staff to `ACTIVE`, publish `staff.invitation-accepted.v1` |
| `resendInvitation(id, actorId)` | Invalidate prior unused tokens, generate new raw token & `StaffInvitationToken` (+7 days), update status to `INVITED`, publish `staff.invited.v1` |
| `updateStaff(id, dto, actorId)` | Update profile fields, audit |
| `updateEmploymentStatus(id, newStatus, actorId, reason?)` | Enforce state machine, validate invariants, audit |
| `getStaff(id)` | Cache-aside fetch, DTO serialization |
| `listStaffBySalon(salonId, query)` | Paginated list with filters (`status`, `role`, `branchId`, `search`, `employeeCode`, `hasService`, `availableToday`, date ranges) |
| `getStaffAvailability(staffId, date, branchId)` | Compute bookable windows from schedule and approved leaves |
| `terminateStaff(id, dto, actorId)` | Transition to `TERMINATED`, set `terminatedAt`, deactivate all assignments |
| `deleteStaff(id, version, actorId)` | Transition to `ARCHIVED`, soft delete |

#### Automatic Employee Code Generation Algorithm:
When `CreateStaffDto` does not supply a custom `employeeCode`:
1. `StaffService` queries `StaffRepository.countBySalon(salonId)`.
2. Formats next sequential code: `EMP` + 0-padded 3-digit number (e.g. `EMP001`, `EMP002`, `EMP010`).
3. Handles concurrent creation collisions via retry loop in transaction.

### 5.2 BranchAssignmentService

| Method | Responsibility |
|---|---|
| `assignStaffToBranch(dto, actorId)` | Create `StaffBranchAssignment`, enforce no duplicate overlap |
| `updateAssignment(id, dto, actorId)` | Update dates or primary flag, validate primary constraint |
| `unassignStaff(id, version, actorId)` | Deactivate assignment, validate at-least-one-active invariant |
| `assignServiceToStaff(dto, actorId)` | Link staff to `BranchService`, validate branch alignment |
| `unassignServiceFromStaff(id, actorId)` | Remove service capability link |
| `getAssignmentsForStaff(staffId)` | List all active branch and service assignments |

### 5.3 WorkingScheduleService

| Method | Responsibility |
|---|---|
| `setSchedule(dto, actorId)` | Create weekly schedule for staff+branch, validate time ranges and breaks |
| `updateSchedule(id, dto, actorId)` | Update schedule entry with effectiveFrom date |
| `deleteSchedule(id, version, actorId)` | Soft delete schedule entry |
| `getScheduleForStaff(staffId, branchId)` | Fetch full effective weekly schedule |
| `getEffectiveSchedule(staffId, branchId, date)` | Resolve schedule applicable on a specific date (Booking integration) |

### 5.4 LeaveService

| Method | Responsibility |
|---|---|
| `requestLeave(dto, staffId)` | Submit leave, validate no overlapping approved leaves |
| `approveLeave(id, approverId)` | Approve, set `approvedById`, `approvedAt`, set `isBookingBlocked = true`, emit event |
| `rejectLeave(id, approverId, reason)` | Reject with reason, set `approvedById`, `approvedAt`, emit event |
| `cancelLeave(id, staffId)` | Staff self-cancel `PENDING` leave only |
| `listLeaves(staffId, query)` | Paginated leaves with filters |
| `isStaffOnLeave(staffId, date)` | Boolean availability check (Booking integration) |

---

## 6. Repository Plan

### StaffRepository
- `findById(id)` — PK lookup with soft-delete filter
- `findBySalon(salonId, query)` — Paginated with filters (`status`, `role`, `branchId`, `search`, `employeeCode`, `joinedAfter`, `joinedBefore`, `hasService`, `availableToday`)
- `findByUser(userId)` — User → Staff lookup
- `findByCode(salonId, code)` — Employee code lookup
- `countBySalon(salonId)` — Used for employee code auto-generation
- `create(data, tx)`
- `update(id, version, data, tx)` — Optimistic lock
- `softDelete(id, version, tx)`

### StaffInvitationTokenRepository
- `create(data, tx)` — Store new hashed invitation token
- `findByTokenHash(tokenHash)` — Token lookup for acceptance
- `invalidateUnusedForStaff(staffId, tx)` — Deactivates previous unused tokens on resend
- `markAsUsed(id, tx)` — Set `usedAt = NOW()`

### StaffAssignmentRepository
- `findById(id)`
- `findByStaff(staffId)` — All active branch assignments
- `findByBranch(branchId)` — All staff assigned to a branch
- `findOverlap(staffId, branchId, startDate, endDate)` — Date overlap check
- `findServiceAssignment(staffId, branchServiceId)` — Duplicate check
- `create(data, tx)` / `update(id, version, data, tx)` / `softDelete(id, version, tx)`

### StaffScheduleRepository
- `findById(id)`
- `findSchedule(staffId, branchId)` — All active schedule rows
- `findEffectiveOnDate(staffId, branchId, date)` — Date-specific schedule resolution
- `findOverlap(staffId, branchId, dayOfWeek, effectiveFrom, effectiveUntil)` — Overlap validation
- `create(data, tx)` / `update(id, version, data, tx)` / `softDelete(id, version, tx)`

### StaffLeaveRepository
- `findById(id)`
- `findByStaff(staffId, query)` — Paginated
- `findApprovedOverlap(staffId, startDate, endDate)` — Prevents overlapping approved leaves
- `findByDateRange(staffId, startDate, endDate)` — Booking availability check
- `create(data, tx)` / `update(id, version, data, tx)` / `softDelete(id, version, tx)`

---

## 7. DTO Plan

### Request DTOs

| DTO | Key Fields & Validation |
|---|---|
| `CreateStaffDto` | `salonId`, `displayName`, `role`, `employeeCode?` (auto-generated if omitted), `invitePhone/Email`, `bio?` |
| `AcceptStaffInvitationDto` | `token` (raw token string), `userId` (authenticated user ID) |
| `UpdateStaffDto` | Partial profile fields + `version` |
| `CreateBranchAssignmentDto` | `staffId`, `branchId`, `isPrimary`, `startDate`, `endDate?` |
| `UpdateBranchAssignmentDto` | `isPrimary?`, `endDate?`, `isActive?`, `version` |
| `CreateServiceAssignmentDto` | `staffId`, `branchServiceId` |
| `CreateWorkingHoursDto` | `staffId`, `branchId`, `dayOfWeek`, `startTime`, `endTime`, `breaks[]`, `effectiveFrom`, `effectiveUntil?` |
| `UpdateWorkingHoursDto` | Partial + `version` |
| `CreateLeaveDto` | `leaveType`, `startDate`, `endDate`, `halfDayPeriod?`, `reason?` |
| `RejectLeaveDto` | `reason: string` |
| `SearchStaffQueryDto` | `salonId?`, `branchId?`, `status?`, `role?`, `search?` (name/code search), `employeeCode?`, `joinedAfter?`, `joinedBefore?`, `hasService?` (branchServiceId), `availableToday?` (boolean), `page`, `limit`, `sortBy`, `sortDir` |
| `StaffAvailabilityQueryDto` | `staffId`, `branchId`, `date` |

### Response DTOs

| DTO | Purpose |
|---|---|
| `StaffDto` | Public-safe profile (no PII) |
| `StaffDetailDto` | Owner/Admin view (includes employment dates, userId, invitationExpiresAt) |
| `StaffBranchAssignmentDto` | Branch assignment details |
| `StaffServiceAssignmentDto` | Service capability details |
| `StaffWorkingHoursDto` | Single schedule row |
| `StaffScheduleSummaryDto` | Full weekly schedule for staff+branch |
| `StaffLeaveDto` | Leave request record (includes `approvedById`, `approvedAt`, `rejectionReason`) |
| `StaffAvailabilityDto` | Bookable slots for a date |
| `PaginatedStaffDto` | Paginated staff list envelope |

---

## 8. REST API Surface

### Public — `@Public()` — `/api/v1/staff`

| Method | Route | Description |
|---|---|---|
| `POST` | `/accept-invitation` | Accept staff invitation with raw token |
| `GET` | `/branches/:branchId/staff` | List active staff for a branch |
| `GET` | `/:id` | Get staff public profile |
| `GET` | `/:id/schedule` | Get staff weekly schedule |
| `GET` | `/:id/availability` | Get staff availability on a date |

### Owner — `JwtAuthGuard` + `@Roles(SALON_OWNER)` — `/api/v1/owner/staff`

| Method | Route | Description |
|---|---|---|
| `POST` | `/` | Create staff (invite, generate code & token) |
| `POST` | `/:id/resend-invite` | Resend expired/pending invitation (generates new token) |
| `PATCH` | `/:id` | Update staff profile |
| `PATCH` | `/:id/status` | Update employment status |
| `DELETE` | `/:id` | Soft delete staff |
| `POST` | `/:id/branches` | Assign staff to branch |
| `PATCH` | `/assignments/:id` | Update branch assignment |
| `DELETE` | `/assignments/:id` | Remove branch assignment |
| `POST` | `/:id/services` | Assign service capability |
| `DELETE` | `/services/:id` | Remove service capability |
| `POST` | `/:id/schedule` | Set working schedule |
| `PATCH` | `/schedule/:id` | Update schedule entry |
| `DELETE` | `/schedule/:id` | Delete schedule entry |
| `GET` | `/` | List all staff for own salon (supports all `SearchStaffQueryDto` filters) |
| `GET` | `/:id/leaves` | List staff leave requests |
| `PATCH` | `/leaves/:id/approve` | Approve leave |
| `PATCH` | `/leaves/:id/reject` | Reject leave |

### Staff Self-Service — `JwtAuthGuard` (self only) — `/api/v1/me/staff`

| Method | Route | Description |
|---|---|---|
| `GET` | `/profile` | View own staff profile |
| `PATCH` | `/profile` | Update own bio/avatar |
| `POST` | `/leaves` | Submit leave request |
| `PATCH` | `/leaves/:id/cancel` | Cancel own pending leave |
| `GET` | `/leaves` | View own leave history |
| `GET` | `/schedule` | View own working schedule |

### Admin — `JwtAuthGuard` + `@Roles(SUPER_ADMIN)` — `/api/v1/admin/staff`

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | List all staff platform-wide |
| `GET` | `/:id` | Get any staff full detail |
| `PATCH` | `/:id/status` | Override employment status |
| `GET` | `/leaves` | Platform-wide leave overview |

---

## 9. Working Hours Model

### Weekly Schedule
- Each `(staffId, branchId)` pair has up to 7 rows — one per `dayOfWeek`.
- `effectiveFrom` / `effectiveUntil` support temporary overrides without deleting the base schedule.
- If no effective row exists for a given date, staff is considered unscheduled for that day.

### Break Times
- Stored as inline JSON array: `[{ "start": "12:00", "end": "13:00" }]`.
- Booking Module excludes break intervals from available appointment slots.
- Enterprise relational migration (`StaffBreak` table) reserved for Phase 15.

### Multiple Shifts (Split-Shift)
- Multiple rows per `(staffId, branchId, dayOfWeek)` allowed **only if date ranges are non-overlapping**.
- Enables morning + evening split-shift modeling.

### Holiday Handling
- Platform holidays injected as `StaffLeave` with `leaveType: CUSTOM`.
- Future: dedicated `HolidayCalendar` aggregate (Phase 15 consideration).

---

## 10. Leave Management Model

### Leave Request Flow

```
Staff submits leave (CreateLeaveDto)
    ↓
Overlap validation (findApprovedOverlap)
    ↓
Status: PENDING
    ↓
Owner reviews
    ↓ APPROVED                    ↓ REJECTED
approvedById & approvedAt set   approvedById & approvedAt set
isBookingBlocked = true         rejectionReason set
staff.leave-approved.v1         staff.leave-rejected.v1
Cache invalidated               Notification sent
```

### Leave Types

| Type | Description |
|---|---|
| `SICK` | Unplanned illness |
| `CASUAL` | General leave |
| `ANNUAL` | Planned vacation |
| `EMERGENCY` | Urgent absence |
| `HALF_DAY` | Morning or afternoon only |
| `CUSTOM` | Admin-defined reason |

### Booking Blocking Rules
- Approved leave blocks all slots in `[startDate, endDate]` inclusive.
- `HALF_DAY`: blocks only the specified `halfDayPeriod` portion.
- `LeaveService.isStaffOnLeave(staffId, date)` returns boolean — primary Booking integration point.

---

## 11. Booking Module Integration Contract

> The Booking Module (Phase 13) is a **read consumer** only. It does NOT write to Staff Module tables.

| Booking Need | Staff Module API |
|---|---|
| Is staff bookable? | `StaffService.getStaff(id)` → `employmentStatus === ACTIVE` |
| Working hours on a date | `WorkingScheduleService.getEffectiveSchedule(staffId, branchId, date)` |
| Is staff on leave? | `LeaveService.isStaffOnLeave(staffId, date)` |
| What services can staff perform? | `BranchAssignmentService.getAssignmentsForStaff(staffId).serviceAssignments` |
| Bookable staff for a service | `StaffService.listStaffBySalon(salonId, { branchId, status: ACTIVE, hasService: branchServiceId, availableToday: true })` |

**Coupling rules:**
- Booking imports `StaffModule` and calls exported services only.
- No direct repository access from Booking into Staff tables.
- Staff Module exports: `StaffService`, `BranchAssignmentService`, `WorkingScheduleService`, `LeaveService`.

---

## 12. Shared Services Integration

| Service | Usage in Staff Module |
|---|---|
| `TransactionService` | All multi-table writes: `createStaff`, `acceptInvitation`, `assignServiceToStaff`, `approveLeave`, `terminateStaff` |
| `AuditService` | `logInTransaction()` for: status changes, branch assignments, leave approvals/rejections, terminations |
| `CacheService` | Cache-aside reads for staff profiles, working schedules, branch roster |
| `EventBusService` | Publish domain events post-commit |
| `NotificationService` | Invitation notification (INVITED), leave approval/rejection notification, invitation resend |

---

## 13. Cache Strategy

| Cache Key | TTL | Invalidated On |
|---|---|---|
| `staff:profile:<staffId>` | 30 min | `updateStaff`, `updateEmploymentStatus` |
| `staff:schedule:<staffId>:<branchId>` | 1 hour | `setSchedule`, `updateSchedule`, `deleteSchedule` |
| `staff:availability:<staffId>:<branchId>:<date>` | 15 min | Leave approval, schedule update |
| `branch:roster:<branchId>` | 30 min | `assignStaffToBranch`, `unassignStaff`, status change |
| `staff:leaves:<staffId>` | 15 min | Any leave mutation |

**Rules:**
- No cache writes inside transactions.
- All invalidations executed post-commit.
- Booking Module reads `staff:availability` cache. Staff Module owns all invalidation.

---

## 14. Domain Events

| Event | Trigger | Payload |
|---|---|---|
| `staff.invited.v1` | Staff invitation created/resent | `{ staffId, salonId, invitePhone, inviteEmail, expiresAt }` |
| `staff.invitation-accepted.v1` | Invitation accepted via token | `{ staffId, salonId, userId }` |
| `staff.created.v1` | Staff profile created/accepted | `{ staffId, salonId, role, employeeCode }` |
| `staff.updated.v1` | Profile fields updated | `{ staffId, salonId }` |
| `staff.status-changed.v1` | Employment status transition | `{ staffId, oldStatus, newStatus, actorId }` |
| `staff.branch-assigned.v1` | Branch assignment created | `{ staffId, branchId, isPrimary }` |
| `staff.branch-unassigned.v1` | Branch assignment deactivated | `{ staffId, branchId }` |
| `staff.service-assigned.v1` | Service capability added | `{ staffId, branchServiceId }` |
| `staff.service-unassigned.v1` | Service capability removed | `{ staffId, branchServiceId }` |
| `staff.leave-requested.v1` | Leave submitted | `{ leaveId, staffId, startDate, endDate, leaveType }` |
| `staff.leave-approved.v1` | Leave approved | `{ leaveId, staffId, approverId, startDate, endDate }` |
| `staff.leave-rejected.v1` | Leave rejected | `{ leaveId, staffId, approverId, reason }` |
| `staff.suspended.v1` | Staff suspended | `{ staffId, actorId, reason }` |
| `staff.terminated.v1` | Staff terminated | `{ staffId, actorId, terminatedAt }` |

---

## 15. Index Recommendations

| Table | Index | Purpose |
|---|---|---|
| `Staff` | `(salonId, employmentStatus, deletedAt)` | Roster listing |
| `Staff` | `(salonId, role, employmentStatus)` | Role-filtered roster listing (e.g. all active stylists) |
| `Staff` | `(userId)` UNIQUE | User → Staff lookup |
| `Staff` | `(salonId, employeeCode)` UNIQUE | Code uniqueness |
| `StaffInvitationToken` | `(tokenHash)` UNIQUE | Rapid token resolution on acceptance |
| `StaffInvitationToken` | `(staffId, expiresAt, usedAt)` | Token validation and invalidation |
| `StaffBranchAssignment` | `(staffId, isActive, deletedAt)` | Staff assignments lookup |
| `StaffBranchAssignment` | `(branchId, isActive, deletedAt)` | Branch roster |
| `StaffBranchAssignment` | `(staffId, branchId)` UNIQUE partial (isActive=true) | Duplicate prevention |
| `StaffServiceAssignment` | `(staffId, isActive)` | Service capability lookup |
| `StaffServiceAssignment` | `(staffId, branchServiceId)` UNIQUE | Duplicate prevention |
| `StaffWorkingHours` | `(staffId, branchId, dayOfWeek, effectiveFrom)` | Schedule resolution |
| `StaffLeave` | `(staffId, status, startDate, endDate)` | Availability and overlap checks |
| `StaffLeave` | `(staffId, startDate, endDate)` PARTIAL where status=APPROVED | Booking availability |

---

## 16. Security Model

### Token Security
- Invitation raw tokens are 32-byte (256-bit) cryptographically secure random hex strings.
- Only the SHA-256 `tokenHash` is persisted in the database to prevent database leaks from exposing active invitation links.
- Single-use enforced via `usedAt` timestamp check and update inside `TransactionService`.

### Owner Isolation
- Owners manage only staff belonging to their own salon.
- `salonId` from JWT context validated against staff record in service layer.
- Cross-salon access rejected with `ForbiddenException`.

### RBAC

| Role | Capability |
|---|---|
| `SALON_OWNER` | Full CRUD on own salon staff |
| `SUPER_ADMIN` | Read + status override on any staff |
| `STAFF_MEMBER` | Self profile update + leave self-service only |
| Public | View active staff profile + schedule (no PII), accept invitation via token |

### UUID Validation
- All route params validated via `ParseUUIDPipe`.

### DTO Validation
- `class-validator` decorators: `@IsUUID`, `@IsEnum`, `@IsISO8601`, `@IsPositive`, `@MaxLength`, `@IsString`.

### PII Handling
- `StaffDto` (public) excludes: `userId`, `terminatedAt`, `joinedAt`, `employeeCode`.
- `StaffDetailDto` (owner/admin) exposes full record.
- Phone/email live on the User record (Phase 8) — not duplicated in Staff aggregate.

### Soft Delete Enforcement
- All repository queries include `deletedAt: null` filter.
- Terminated staff remain with `deletedAt` set and status `ARCHIVED`.

---

## 17. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scheduling conflict: two bookings in same staff slot | Medium | High | Optimistic locking on appointments (Phase 13). Availability query atomic. |
| Leave-booking race: leave approved mid-booking creation | Medium | High | Booking checks leave inside its own transaction. Leave approval immediately invalidates availability cache. |
| Primary assignment loss: all branch assignments deactivated | Low | High | Service-layer invariant: deactivation blocked if it would remove the last active assignment. |
| Duplicate service assignment | Low | Medium | DB unique constraint + pre-flight `findServiceAssignment()` check. |
| Overlapping working hours for same staff/branch/day | Low | Medium | `findOverlap()` validation in `WorkingScheduleService` before insert. |
| Overlapping approved leaves | Low | Medium | `findApprovedOverlap()` validation in `LeaveService`. |
| Scalability: 10k+ salons each with 20+ staff | Low (near-term) | High (future) | Paginated queries from day one. ElasticSearch index reserved for Phase 15. |
| Stale availability cache after leave approval | Low | High | Event-driven invalidation: `staff.leave-approved.v1` triggers `CacheService.delete(staff:availability:*)`. |
| Stale invitation link / replay attack | Low | High | SHA-256 `tokenHash`, single-use `usedAt` flag, 7-day expiration threshold. |

---

## 18. Approval Checklist

Before Phase 12.1 (Prisma Schema) may begin, confirm:

- [ ] Aggregate design (including `StaffInvitationToken`) reviewed and approved
- [ ] Employment status state machine (including `EXPIRED` status) approved
- [ ] Token-based invitation flow (`AcceptStaffInvitationDto`, `/accept-invitation` endpoint) approved
- [ ] Custom role future extension architecture approved
- [ ] Automatic employee code generation (`EMP001`) approved
- [ ] Working hours model (breaks, multi-shift, effective dates) approved
- [ ] Leave management flow (approval metadata, booking blocking) approved
- [ ] Booking integration contract approved
- [ ] Search query filters (`search`, `employeeCode`, `joinedAfter`, `joinedBefore`, `hasService`, `availableToday`) approved
- [ ] REST API surface approved (Public / Owner / Self-Service / Admin)
- [ ] Cache key strategy approved
- [ ] Domain events list (including `staff.invited.v1` and `staff.invitation-accepted.v1`) approved
- [ ] Index recommendations (including `StaffInvitationToken.tokenHash`) approved
- [ ] Security model (token hashing, PII handling, owner isolation) approved
- [ ] Risk register reviewed

> **STOP — Awaiting explicit approval before Phase 12.1 (Database Schema Implementation) begins.**
