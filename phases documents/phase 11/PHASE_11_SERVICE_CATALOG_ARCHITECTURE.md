# Phase 11.0 — Service Catalog Module Architecture Specification

## Salon Booking & Management Platform

**Version:** 11 (Production Freeze Hardened Blueprint)  
**Date:** 2026-08-06  
**Author:** Principal Software Architect (Antigravity)  
**Status:** Frozen & Approved  
**Locked Source of Truth:** PRD v1.2 · Architecture v2.1 · Logical DB v3.1 · Physical DB v4.3 · Implementation Governance v9.0  

---

## 1. Executive Summary

### 1.1 Purpose of Service Catalog
The **Service Catalog Module** forms the foundational menu and pricing engine for the entire Salon Booking & Management Platform. It governs master service categories, standardized service definitions, branch-specific service offerings, pricing variants, durations, and staff skill mappings.

### 1.2 Business Responsibilities
- **Standardized Service Taxonomy:** Maintained centrally by Super Admins to ensure clean categorisation across Indian cities and salons (Hair, Skin, Nails, Spa, Beard, Bridal).
- **Localized Branch Pricing & Duration:** Enables individual salon branches to activate master services while configuring custom pricing (in INR `DECIMAL(12, 2)`), durations (in minutes), and granular status lifecycles independently.
- **Stylist Skill Mapping:** Couples specific branch services to eligible stylists (`StaffService`), enabling the slot engine to calculate stylist availability accurately while enforcing strict status invariants.

### 1.3 System Relationships & Domain Boundaries

```
                 ┌──────────────────────────────────────┐
                 │          Super Admin                 │
                 └──────────────────┬───────────────────┘
                                    │ Manages Master Catalog
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SERVICE CATALOG DOMAIN                           │
│                                                                         │
│  [ ServiceCategory ] ──► [ Service ] ──► [ BranchService ]             │
│                                                   │                     │
└───────────────────────────────────────────────────┼─────────────────────┘
                                                    │
                 ┌──────────────────────────────────┼──────────────────────────────────┐
                 │                                  │                                  │
                 ▼                                  ▼                                  ▼
      ┌────────────────────┐             ┌────────────────────┐             ┌────────────────────┐
      │    SALON DOMAIN    │             │    STAFF DOMAIN    │             │   BOOKING DOMAIN   │
      ├────────────────────┤             ├────────────────────┤             ├────────────────────┤
      │ Branch offering    │             │ StaffService skill │             │ AppointmentItem    │
      │ validation &       │             │ mapping & active   │             │ IMMUTABLE snapshot │
      │ ownership check    │             │ status invariants  │             │ pricing & metadata │
      └────────────────────┘             └────────────────────┘             └────────────────────┘
```

- **Salon Module (`domains/salon`):** Verifies branch existence, active status, and ownership (`salon.ownerId == currentUser.id`).
- **Staff Module (`domains/staff`):** Consumes `StaffService` to filter qualified stylists for slot availability computation.
- **Booking Module (`domains/booking`):** Reads active `BranchService` records to generate sequential multi-service appointment time windows and locks immutable line-item pricing (`AppointmentItem`).
- **Pricing & Revenue Engine:** Calculates commission (Free Plan 5–10% vs Premium Plan 0%) and regional GST tax applications (`TaxRegion`).
- **Reviews Module (`domains/review`):** Derives service-level satisfaction metrics by aggregating ratings from completed appointments.

---

## 2. Aggregate Design

### 2.1 Two-Tier Aggregate Architecture

The Service Catalog implements a **Two-Tier Aggregate Model** separating platform governance from multi-tenant business operations:

1. **Master Service Catalog Aggregate (Platform Governance)**  
   `ServiceCategory (Root) ➔ Service`
2. **Branch Service Catalog Aggregate (Tenant Operations)**  
   `Branch (Root) ➔ BranchService ➔ StaffService`

```
  [ Master Catalog Aggregate Root ]            [ Tenant Branch Aggregate Root ]
     ┌─────────────────────────┐                   ┌───────────────────────┐
     │     ServiceCategory     │                   │        Branch         │
     └────────────┬────────────┘                   └───────────┬───────────┘
                  │                                            │
                  ▼                                            ▼
             ┌─────────┐                            ┌─────────────────────┐
             │ Service │ ◄───────────────────────── │    BranchService    │
             └─────────┘                            └──────────┬──────────┘
                                                               │
                                                               ▼
                                                    ┌─────────────────────┐
                                                    │    StaffService     │
                                                    └─────────────────────┘
```

### 2.2 Aggregate Justification
- **Platform Standardization:** Enforcing `ServiceCategory ➔ Service` centrally prevents salon owners from creating messy, duplicate, or misspelled master categories (e.g. "Hair Cut", "haircut", "Hair-Cut") which breaks global customer search and analytics.
- **Tenant Autonomy:** `Branch ➔ BranchService` ensures that Branch A in Mumbai and Branch B in Jaipur can offer the same master "Men's Haircut" service at different prices (e.g. ₹500 vs ₹250) and durations (30m vs 45m) without mutating shared data or requiring separate database rows for the master service definition.

---

## 3. Domain Model

### 3.1 Entity Specifications & Optimistic Concurrency Control

Every mutable entity in the Service Catalog domain natively enforces optimistic concurrency control using an explicit `version` counter column (`version INT NOT NULL DEFAULT 1`). All update operations MUST supply `version`.

#### 1. `ServiceCategory` Entity
- **Fields:** `id` (UUID), `name` (String), `displayOrder` (Int), `iconMediaId` (UUID, optional), `version` (Int, default 1), `createdAt` (Timestamptz), `updatedAt` (Timestamptz), `deletedAt` (Timestamptz, optional).
- **Constraints:** `name` is unique (`uq_service_categories_name`).
- **Ownership:** Super Admin managed platform reference model.
- **Relationships:** 1:N with `Service`. Optional 1:1 with `Media` (`iconMediaId`).

#### 2. `Service` Entity (Master Definition)
- **Fields:** `id` (UUID), `categoryId` (UUID), `name` (String), `description` (String, optional), `genderCategory` (Enum: `MEN | WOMEN | UNISEX`), `version` (Int, default 1), `createdAt` (Timestamptz), `updatedAt` (Timestamptz), `deletedAt` (Timestamptz, optional).
- **Constraints:** Foreign key `fk_services_category` referencing `ServiceCategory.id` (`ON DELETE RESTRICT`).
- **Ownership:** Super Admin managed platform reference model.
- **Relationships:** N:1 with `ServiceCategory`, 1:N with `BranchService`.

#### 3. `BranchService` Entity (Branch Offering & Pricing)
- **Fields:** `id` (UUID), `branchId` (UUID), `serviceId` (UUID), `price` (Decimal `12,2`), `durationMinutes` (Int), `status` (Enum: `DRAFT | ACTIVE | INACTIVE | ARCHIVED`), `isActive` (Boolean), `version` (Int, default 1), `createdAt` (Timestamptz), `updatedAt` (Timestamptz), `deletedAt` (Timestamptz, optional).
- **Constraints:**
  - Composite Unique Index `idx_branch_services_lookup` on `(branchId, serviceId)`.
  - Composite Index `idx_branch_services_status` on `(branchId, isActive, status)`.
  - Check constraint `chk_branch_services_price_positive` (`price >= 0.00`).
  - Check constraint `chk_branch_services_duration_positive` (`durationMinutes > 0 AND durationMinutes <= 1440`).
  - Foreign key `fk_branch_services_branch` (`ON DELETE CASCADE`).
  - Foreign key `fk_branch_services_service` (`ON DELETE RESTRICT`).
- **Ownership:** Owned by `Salon` owner via `Branch`.
- **Relationships:** N:1 with `Branch`, N:1 with `Service`, 1:N with `StaffService`, 1:N with `AppointmentItem`.

#### 4. `StaffService` Entity (Stylist Skill Linkage)
- **Fields:** `staffId` (UUID), `branchServiceId` (UUID).
- **Constraints:** Composite Primary Key `pk_staff_services` on `(staffId, branchServiceId)`. Junction table without audit timestamps.
- **Relationships:** N:1 with `Staff`, N:1 with `BranchService`.

#### 5. `ServiceMedia` Entity (Centralized Media Integration)
- Service cover images and category icons reference the global `Media` entity (`id`, `url`, `thumbnailUrl`, `publicId`, `mimeType`, `fileSize`).

#### 6. Reserved Entity: `BranchServicePriceHistory` (Audit & History Reservation)
- **Fields:** `id` (UUID), `branchServiceId` (UUID), `oldPrice` (Decimal `12,2`), `newPrice` (Decimal `12,2`), `changedById` (UUID), `effectiveFrom` (Timestamptz).
- **Purpose:** Reserved entity for tracking price change audits over time without mutating historical appointments.

#### 7. Reserved Entity: `ServiceVariant` (Future Expansion Reservation)
- **Fields:** `id` (UUID), `serviceId` (UUID), `variantName` (String, e.g. "Children Haircut", "Senior Haircut", "Express Facial", "Premium Facial"), `priceMultiplier` (Decimal `5,2`), `durationMinutes` (Int).

---

## 4. Status Lifecycle & Invariants

### 4.1 Master & Branch Service Status Lifecycle

```
                             ┌─────────────────┐
                             │      DRAFT      │ (Configuring new branch service / pricing)
                             └────────┬────────┘
                                      │
                                      ▼
                             ┌─────────────────┐
                             │     ACTIVE      │ (Available for public search & booking)
                             └────────┬────────┘
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
                ┌─────────────────┐       ┌─────────────────┐
                │    INACTIVE     │       │    ARCHIVED     │
                │ (Temp suppressed)│       │ (Soft deleted)  │
                └─────────────────┘       └─────────────────┘
```

### 4.2 Status Invariant Enforcement Rule

> [!IMPORTANT]
> **STATUS INVARIANT:** The Service domain layer strictly enforces synchronization between `status` and `isActive`:
> - `status == ACTIVE` ➔ `isActive = true`
> - `status == INACTIVE` or `status == ARCHIVED` or `status == DRAFT` ➔ `isActive = false`
>
> The service layer REJECTS any payload or state mutation attempting illegal combinations:
> - `status = ACTIVE` & `isActive = false` ❌ (Forbidden)
> - `status = ARCHIVED` & `isActive = true` ❌ (Forbidden)

### 4.3 Soft Delete & Hard Delete Policy

| Entity | Delete Strategy | Rationale & Policy |
|---|---|---|
| **`ServiceCategory`** | **Soft Delete (`deletedAt`)** | Preserves master category reference for historical reports. Partial unique index on `(name) WHERE deletedAt IS NULL`. |
| **`Service`** | **Soft Delete (`deletedAt`)** | Preserves master service definitions for existing `BranchService` and historical `AppointmentItem` entries. |
| **`BranchService`** | **Soft Delete (`deletedAt`)** | Soft deletes branch offering (`deletedAt = now()`, `status = ARCHIVED`, `isActive = false`). Preserves booking history integrity. |
| **`StaffService`** | **Hard Delete** | Pure junction table. Deleting skill mapping removes junction row directly from DB. |
| **`ServiceMedia`** | **Media Lifecycle** | Managed via global `Media` lifecycle. Removing an icon/cover image purges Cloudinary asset and deletes `Media` row post-commit. |

---

## 5. Folder Structure

The module follows clean architecture conventions inside `apps/api/src/domains/services/`:

```
apps/api/src/domains/services/
├── controllers/
│   ├── services-public.controller.ts     # Public browsing & search endpoints
│   ├── services-owner.controller.ts      # Salon Owner branch pricing & activation endpoints
│   ├── services-admin.controller.ts      # Super Admin master catalog management endpoints
│   └── tests/
│       ├── services-public.controller.spec.ts
│       ├── services-owner.controller.spec.ts
│       └── services-admin.controller.spec.ts
├── dto/
│   ├── create-category.dto.ts
│   ├── update-category.dto.ts
│   ├── create-service.dto.ts
│   ├── update-service.dto.ts
│   ├── activate-branch-service.dto.ts
│   ├── update-branch-service.dto.ts
│   ├── assign-staff-skills.dto.ts
│   ├── search-service-query.dto.ts
│   ├── category-response.dto.ts
│   ├── service-response.dto.ts
│   └── branch-service-response.dto.ts
├── entities/
│   ├── category.entity.ts
│   ├── service.entity.ts
│   └── branch-service.entity.ts
├── events/
│   ├── service-created.event.ts
│   ├── service-updated.event.ts
│   ├── service-deleted.event.ts
│   ├── service-archived.event.ts
│   ├── category-created.event.ts
│   ├── category-updated.event.ts
│   ├── category-deleted.event.ts
│   ├── branch-service-activated.event.ts
│   ├── branch-service-updated.event.ts
│   ├── branch-service-deactivated.event.ts
│   ├── branch-service-archived.event.ts
│   ├── branch-service-price-changed.event.ts
│   └── staff-skills-assigned.event.ts
├── repositories/
│   ├── category.repository.ts
│   ├── service.repository.ts
│   ├── branch-service.repository.ts
│   ├── staff-service.repository.ts
│   └── tests/
│       ├── category.repository.spec.ts
│       ├── service.repository.spec.ts
│       ├── branch-service.repository.spec.ts
│       └── staff-service.repository.spec.ts
├── services/
│   ├── service-catalog.service.ts       # Master service & branch service orchestration
│   ├── category.service.ts              # Category management service
│   ├── pricing.service.ts               # Price calculation, GST & commission rules
│   ├── service-media.service.ts         # Icon & cover image lifecycle service
│   └── tests/
│       ├── service-catalog.service.spec.ts
│       ├── category.service.spec.ts
│       ├── pricing.service.spec.ts
│       └── service-media.service.spec.ts
└── services.module.ts
```

---

## 6. Standardized Repository Design

To maintain strict consistency across all domain modules, every repository in the Service Catalog domain implements a standardized method interface contract:

- `create(data: TCreateInput, tx?: PrismaTransactionClient): Promise<T>`
- `update(id: string, version: number, data: TUpdateInput, tx?: PrismaTransactionClient): Promise<T>`
- `softDelete(id: string, version: number, tx?: PrismaTransactionClient): Promise<void>`
- `findById(id: string, tx?: PrismaTransactionClient): Promise<T | null>`
- `findMany(query: TQueryDto, tx?: PrismaTransactionClient): Promise<{ data: T[]; total: number }>`
- `exists(id: string, tx?: PrismaTransactionClient): Promise<boolean>`
- `count(query?: TQueryDto, tx?: PrismaTransactionClient): Promise<number>`

---

## 7. Domain Services

### 7.1 Service Breakdown & Responsibilities

#### 1. `ServiceCatalogService`
- Orchestrates creation, activation, and listing of master & branch services.
- Validates salon ownership before modifying branch service pricing or skills.
- Enforces optimistic concurrency (`version`) on all update operations.
- Executes multi-repository operations inside `TransactionService.run()`.

#### 2. `CategoryService`
- Manages master service category display orders and icon associations.
- Invalidates global category cache post-commit.

#### 3. `PricingService`
- Enforces pricing invariants:
  - `price >= 0.00`
  - `offerPrice <= basePrice` (if offer price specified)
  - `durationMinutes > 0 AND durationMinutes <= 1440` (Max 24 hours)
  - `commissionAmount >= 0.00`
  - `taxAmount >= 0.00`
- Sets `commission = 0.00` for Premium Plan salons.

#### 4. `ServiceMediaService`
- Manages category icon & service cover uploads via `CloudinaryStorageService`.
- Enforces strict Single-Owner Media Rule (1 icon per category, 1 cover per service, no media reuse).
- Deletes orphaned `Media` rows and Cloudinary assets post-commit.

---

## 8. DTO Design & Mandatory Optimistic Concurrency

### 8.1 Validation, Serialization & Versioning Strategy
- All DTOs use `class-validator` and `class-transformer`.
- **Mandatory `version` Field:** Every update DTO (`UpdateCategoryDto`, `UpdateServiceDto`, `UpdateBranchServiceDto`) MUST explicitly declare `version: number` with `@IsInt()` and `@Min(1)` to satisfy the repository optimistic locking contract.
- Response DTOs apply `@Exclude()` on internal metadata (`createdById`, `updatedById`, `deletedAt`) and `@Expose()` on safe properties.
- Full OpenAPI `@ApiProperty()` annotations provided.

---

## 9. Controller Design & RBAC Matrix

| Endpoint Method & Path | Controller | Access Guard & Role | Description |
|---|---|---|---|
| `GET /services/categories` | Public | `@Public()` | List all active master categories |
| `GET /services` | Public | `@Public()` | Search & list master services |
| `GET /branches/:branchId/services` | Public | `@Public()` | Get active services & prices for a branch |
| `GET /services/:id` | Public | `@Public()` | Get single service detail |
| `POST /branches/:branchId/services` | Owner | `JwtAuthGuard` + `@Roles(SALON_OWNER)` | Activate master service for branch |
| `PATCH /branches/:branchId/services/:id` | Owner | `JwtAuthGuard` + `@Roles(SALON_OWNER)` | Update branch service price/duration/status (requires `version`) |
| `DELETE /branches/:branchId/services/:id` | Owner | `JwtAuthGuard` + `@Roles(SALON_OWNER)` | Soft delete branch service |
| `PUT /branches/:branchId/services/:id/staff` | Owner | `JwtAuthGuard` + `@Roles(SALON_OWNER)` | Assign staff skills to branch service |
| `POST /admin/services/categories` | Admin | `JwtAuthGuard` + `@Roles(SUPER_ADMIN)` | Create master service category |
| `PATCH /admin/services/categories/:id` | Admin | `JwtAuthGuard` + `@Roles(SUPER_ADMIN)` | Update master category |
| `POST /admin/services` | Admin | `JwtAuthGuard` + `@Roles(SUPER_ADMIN)` | Create master service |
| `PATCH /admin/services/:id` | Admin | `JwtAuthGuard` + `@Roles(SUPER_ADMIN)` | Update master service |

---

## 10. Pricing Invariants & Immutable Booking Snapshot Rule

### 10.1 Absolute Pricing Invariants
1. `price >= 0.00`
2. `offerPrice <= basePrice` (if offer price specified)
3. `durationMinutes > 0 AND durationMinutes <= 1440` (Max 24 hours)
4. `commissionAmount >= 0.00`
5. `taxAmount >= 0.00`
6. **Premium Plan Rule:** `commissionAmount = 0.00`

### 10.2 Immutable Booking Snapshot Rule (CRITICAL)
> [!CAUTION]
> **CRITICAL ARCHITECTURAL RULE:** Bookings NEVER reference live `BranchService` prices or descriptions.
>
> When an appointment is created, `AppointmentItem` MUST snapshot:
> - `serviceName` (String)
> - `categoryName` (String)
> - `durationMinutes` (Int)
> - `price` (Decimal `12,2`)
> - `taxAmount` (Decimal `12,2`)
> - `commissionAmount` (Decimal `12,2`)
>
> Changing a service price in `BranchService` NEVER alters historical appointment billing or reporting.

---

## 11. Media Ownership Policy

- **Single-Owner Media Policy:** Every `Media` asset belongs to exactly one domain entity.
  - `CategoryIcon`: Exactly 1 icon per `ServiceCategory`.
  - `ServiceCover`: Exactly 1 cover image per `Service`.
  - `Media Reused`: **NEVER**. Asset links cannot be shared between multiple entities.
- **Cleanup Policy:** Replacing or removing a category icon or service cover image triggers an asynchronous post-commit deletion of the old `Media` row and Cloudinary asset.

---

## 12. Search Architecture & Scalability Roadmap

### 12.1 Query Parameters & Sorting Options
Public & Owner search APIs (`SearchServiceQueryDto`) support:
- **Filters:** `categoryId`, `genderCategory`, `minPrice`, `maxPrice`, `maxDuration`, `branchId`, `salonId`, `isActive`.
- **Search Keywords:** `search` (Fuzzy text matching on `service.name` via `pg_trgm`).
- **Sorting Options:**
  - `POPULARITY` (Most booked services)
  - `RECENTLY_ADDED` (`createdAt DESC`)
  - `HIGHEST_RATED` (Average review rating)
  - `PRICE_ASC` / `PRICE_DESC`
  - `TRENDING` (High booking velocity)

### 12.2 Search Scalability Roadmap
- **Phase 11 MVP:** PostgreSQL `pg_trgm` fuzzy text matching + PostGIS spatial radius queries.
- **Reserved Scale Enhancements:** Full Text Search (`tsvector`), ElasticSearch / OpenSearch indexing adapter, and Vector Search (AI semantic recommendations).

---

## 13. Cache Hierarchy & TTL Strategy

| Cache Key Pattern | Target Data | Redis Type | TTL | Invalidation Trigger |
|---|---|---|---|---|
| `cache:service:categories` | Master Categories List | String (JSON) | 24 Hours | Category Created / Updated / Deleted |
| `cache:service:details:<id>` | Master Service Details | String (JSON) | 12 Hours | Master Service Updated / Deleted |
| `cache:branch:catalog:<branchId>` | Branch Service Catalog | String (JSON) | 1 Hour | BranchService Activated / Updated / Deleted |
| `cache:search:services:<hash>` | Public Search Results | String (JSON) | 15 Minutes | Invalidated via short TTL window |
| `cache:nearby:services:<hash>` | Geo Nearby Service Search | String (JSON) | 15 Minutes | Short TTL spatial search cache |

---

## 14. Event Architecture

### 14.1 Event Contracts
1. `service.created.v1` (`{ serviceId, categoryId, name }`)
2. `service.updated.v1` (`{ serviceId }`)
3. `service.deleted.v1` (`{ serviceId }`)
4. `service.archived.v1` (`{ serviceId }`)
5. `category.created.v1` (`{ categoryId, name }`)
6. `category.updated.v1` (`{ categoryId }`)
7. `category.deleted.v1` (`{ categoryId }`)
8. `branchservice.activated.v1` (`{ branchServiceId, branchId, serviceId, price }`)
9. `branchservice.updated.v1` (`{ branchServiceId, branchId }`)
10. `branchservice.deactivated.v1` (`{ branchServiceId, branchId }`)
11. `branchservice.archived.v1` (`{ branchServiceId, branchId }`)
12. `branchservice.price_changed.v1` (`{ branchServiceId, branchId, oldPrice, newPrice }`)
13. `staff.skills_assigned.v1` (`{ staffId, branchServiceIds }`)

Every event extends `BaseDomainEvent` containing `eventId`, `eventType`, `version: 1`, `aggregateId`, `timestamp`, `payload`, `requestId`, and `traceId`.

---

## 15. Audit Logging & PII Policy

Every mutation executes `auditService.logInTransaction(tx, ...)` capturing:
- `CATEGORY_CREATED`, `CATEGORY_UPDATED`, `SERVICE_CREATED`, `SERVICE_UPDATED`, `BRANCH_SERVICE_ACTIVATED`, `BRANCH_SERVICE_UPDATED`, `BRANCH_SERVICE_DEACTIVATED`, `STAFF_SKILLS_ASSIGNED`.
- Zero PII is processed or logged in the Service Catalog module.

---

## 16. Security & Staff Assignment Invariants

### 16.1 Staff Assignment Invariants
> [!IMPORTANT]
> A stylist (`Staff`) CANNOT be assigned to a `BranchService` if:
> 1. The `Staff` member itself is not `ACTIVE` (`staff.isActive == false`).
> 2. The `BranchService` is `INACTIVE` or `ARCHIVED`.
> 3. The master `Service` or `ServiceCategory` is `INACTIVE` or `ARCHIVED`.
> 4. The target `Branch` is `SUSPENDED` or `INACTIVE`.
> 5. The `Staff` member does not have an active `StaffAssignment` at the target `Branch`.

---

## 17. Database Index Strategy

- `uq_service_categories_name` on `service_categories(name)`
- `fk_services_category` on `services(category_id)`
- `idx_branch_services_lookup` on `branch_services(branch_id, service_id)`
- `idx_branch_services_status` on `branch_services(branch_id, is_active, status)`
- `idx_branch_services_branch_status` on `branch_services(branch_id, status)`
- `idx_services_category_id` on `services(category_id)`
- `idx_branch_services_service_id` on `branch_services(service_id)`
- `idx_branch_services_status_deleted` on `branch_services(status, deleted_at)`
- `pk_staff_services` on `staff_services(staff_id, branch_service_id)`

---

## 18. Scalability & Future Extension Reservations

- **`BranchServicePriceHistory`**: Reserved audit entity for tracking price changes over time.
- **`ServiceVariant`**: Reserved entity for tiered service options (e.g. Children Haircut, Senior Haircut, Express Facial).
- **`ServiceBundle`**: Reserved entity for multi-service package deals.

---

## 19. Risk Analysis & Mitigation Matrix

| Identified Risk | Consequence | Mitigation Strategy |
|---|---|---|
| Concurrent price edits | Overwriting price changes | Mandatory optimistic concurrency version checking (`version`) |
| Historical invoice corruption | Service price changes alter past bookings | Immutable `AppointmentItem` snapshot rule |
| Invalid staff skill assignment | Ineligible stylist assigned to booking | Enforce Staff Assignment Invariants (Staff & Service `isActive == true`) |
| Stale branch catalog cache | Customer sees outdated price | Reactive post-commit cache eviction on `CACHE_KEYS.BRANCH_CATALOG(branchId)` |

---

## 20. Architecture Freeze Checklist

All 15 architectural pre-requisites are verified and frozen prior to code implementation:

- [x] **Aggregate boundaries finalized:** Master (`Category ➔ Service`) and Tenant (`Branch ➔ BranchService ➔ Staff`).
- [x] **Entity ownership finalized:** Platform Super Admin vs Salon Owner boundaries.
- [x] **Repository contracts frozen:** Standardized (`create`, `update`, `softDelete`, `findById`, `findMany`, `exists`, `count`).
- [x] **DTO strategy defined:** Mandatory `version: number` property on all update DTOs.
- [x] **Optimistic concurrency defined:** Enforced via `version` column and check.
- [x] **Cache strategy defined:** Hierarchical TTLs including `cache:nearby:services:<hash>`.
- [x] **Event strategy defined:** 13 versioned domain events (`*.v1`).
- [x] **Search roadmap reserved:** `pg_trgm` MVP with Full-Text, OpenSearch & Vector Search reservations.
- [x] **Booking snapshot invariant frozen:** Immutably snapshots `price`, `tax`, `commission`, `duration`.
- [x] **Pricing invariants frozen:** `0 <= price`, `duration <= 1440`, `offerPrice <= basePrice`.
- [x] **Media ownership frozen:** Single owner per asset, zero media link sharing.
- [x] **Database indexing strategy frozen:** Includes composite `(branchId, status)` and `(status, deletedAt)`.
- [x] **Multi-tenant authorization frozen:** Owner branch check + Staff active status check.
- [x] **Shared service integration frozen:** `TransactionService`, `AuditService`, `CacheService`, `EventBusService`.
- [x] **Future extension points documented:** `BranchServicePriceHistory`, `ServiceVariant`, `ServiceBundle`.
