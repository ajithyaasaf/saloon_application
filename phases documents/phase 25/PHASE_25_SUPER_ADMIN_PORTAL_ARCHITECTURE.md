# PHASE 25 — SUPER-ADMIN PLATFORM PORTAL ARCHITECTURAL SPECIFICATION

## 1. Architectural Overview

The Super-Admin Platform Portal (`apps/admin-dashboard`) is the central governance and operational control center for the multi-tenant Saloon platform. It provides macro-level observability, security enforcement, tenant compliance, catalog standardization, financial auditing, content moderation, broadcast communications, and media asset management.

### Monorepo Position & Boundaries
```
┌─────────────────────────────────────────────────────────────┐
│                    Super-Admin Portal                       │
│                  (apps/admin-dashboard)                     │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      @saloon/shared-types    │ │     @saloon/shared-utils   │
│   (Canonical DTOs & Enums)   │ │  (ApiClient & Formatters)  │
└──────────────┬───────────────┘ └─────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       @saloon/config                        │
│                 (API_ROUTES & Constants)                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend REST Platform                    │
│             (apps/api — 12 Admin Controllers)               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Security & RBAC Isolation Architecture

1. **Role Enforcement**:
   - Only users with `UserRole.SUPER_ADMIN` can access protected dashboard routes.
   - `AuthContext` checks `user?.role === UserRole.SUPER_ADMIN`. Any other role (e.g. `SALON_OWNER`, `CUSTOMER`) is denied and redirected.
2. **Self-Protection Rules**:
   - Backend enforces that super-admins cannot demote their own role or delete their own user account.
   - UI reflects this by disabling role dropdown changes and delete actions on the currently authenticated admin's user record.
3. **Audit Trail Integrity**:
   - All destructive actions (salon rejection, review suppression, dispute resolution, user suspension) require explicit notes/reasons transmitted to backend audit services.
4. **Credential Isolation**:
   - No cloud storage API keys, database secrets, or third-party private keys are loaded in frontend client code.
   - Internal storage metadata (bucket names, object keys, checksums) is accessed solely via authorized admin inspection endpoints.

---

## 3. Screen Hierarchy & Navigation Layout

```
apps/admin-dashboard/src/app/
├── (auth)/
│   └── login/                       # Super Admin Email/Password Login
└── (dashboard)/
    ├── page.tsx                     # Executive Platform Command Center (KPIs & Metrics)
    ├── salons/
    │   ├── page.tsx                 # Salon Governance & Approval Queue
    │   └── [id]/page.tsx            # Salon & Branch Inspection / Detail Drawer
    ├── users/
    │   ├── page.tsx                 # Platform User Directory & Role Manager
    │   └── [id]/page.tsx            # User Detail, Sessions, & Suspension Controls
    ├── staff/
    │   └── page.tsx                 # Cross-Salon Staff Audit & Leave Approvals
    ├── customers/
    │   ├── page.tsx                 # Customer CRM Directory
    │   ├── blocked/page.tsx         # Blacklisted Customer Management
    │   └── archived/page.tsx        # Archived Customer Records
    ├── bookings/
    │   └── page.tsx                 # Global Bookings Ledger & Lock Maintenance
    ├── payments/
    │   ├── page.tsx                 # Financial Transactions & Volume Dashboard
    │   ├── failed/page.tsx          # Failed Payment Investigations & Webhook Retry
    │   └── refunds/page.tsx         # Global Refund History
    ├── catalog/
    │   └── page.tsx                 # Master Service Categories & Services
    ├── inventory/
    │   └── page.tsx                 # Stock Valuation, Movement Ledger, POs & Audits
    ├── promotions/
    │   └── page.tsx                 # Coupons, Gift Cards, Flash Sales & Campaigns
    ├── reviews/
    │   ├── page.tsx                 # Review Moderation & Suppression
    │   ├── flags/page.tsx           # Flagged Review Reports
    │   └── disputes/page.tsx        # Dispute Arbitration Center
    ├── notifications/
    │   ├── page.tsx                 # System Broadcast Dispatcher
    │   └── templates/page.tsx       # Platform Notification Template Editor
    ├── media/
    │   └── page.tsx                 # Global Media Oversight & Soft-Deleted Asset Recovery
    └── health/
        └── page.tsx                 # Infrastructure Health, Redis/DB Probes & Telemetry
```

---

## 4. Administrative Domain Services Matrix

| Service | Backend Controller / Endpoints | Primary Responsibilities |
| :--- | :--- | :--- |
| `authService` | `AuthController`, `UsersController` | Super-admin login, logout, session restoration |
| `adminDashboardService` | `CustomerAdminController`, `BookingAdminController`, `PaymentAdminController`, `InventoryAdminController`, `HealthController` | Aggregate KPI statistics, system status probes |
| `adminSalonService` | `SalonAdminController`, `SalonPublicController` | Salon search, branch inspection, approve/reject workflow |
| `adminUserService` | `UsersController`, `StaffAdminController` | User directory, role updates, suspend/restore, staff leave approvals |
| `adminCustomerService`| `CustomerAdminController` | Customer search, blacklist management, archived accounts |
| `adminBookingService` | `BookingAdminController` | Cross-salon bookings, filter queries, lock cleanup |
| `adminPaymentService` | `PaymentAdminController` | Payment transactions, failed payments, refunds, webhook retry |
| `adminCatalogService` | `ServiceCatalogAdminController`, `ServiceCatalogOwnerController` | Master categories and services CRUD, branch pricing matrix |
| `adminInventoryService`| `InventoryAdminController` | Stock valuation, movements, purchase orders, transfers, audits |
| `adminPromotionService`| `PromotionAdminController` | Coupons, usage ledgers, gift cards, flash sales, campaigns |
| `adminReviewService` | `ReviewAdminController` | Review moderation, hide/publish/reject/archive, flag resolution, dispute arbitration |
| `adminNotificationService` | `NotificationAdminController` | Template management, render/preview, direct send, broadcast dispatcher |
| `adminMediaService` | `MediaAdminController` | Cross-tenant asset search, metadata inspection, soft deletion, asset restore |
| `adminHealthService` | `HealthController` | DB, Redis, and S3/R2 readiness probes, uptime telemetry |

---

## 5. Implementation Roadmap (Sub-Phases 25.1 – 25.17)

- **25.1**: Foundation & Workspace Configuration
- **25.2**: Authentication, Session & RBAC Route Protection
- **25.3**: Admin Layout & Design System Primitives
- **25.4**: Platform Executive Dashboard
- **25.5**: Salon Verification & Governance
- **25.6**: User & Staff Governance
- **25.7**: Customer CRM & Audience Oversight
- **25.8**: Global Booking Operations
- **25.9**: Financial Audit, Payments & Webhooks
- **25.10**: Master Service Catalog
- **25.11**: Inventory Platform Oversight
- **25.12**: Promotions & Marketing Audit
- **25.13**: Review Moderation & Dispute Arbitration
- **25.14**: Notification Engine & Broadcast Center
- **25.15**: Media Asset Governance
- **25.16**: Platform Health & System Telemetry
- **25.17**: Testing, Monorepo Regression & Production Verification
