# PHASE 25 — SUPER-ADMIN PLATFORM PORTAL

## Background

Phase 24 (Customer Mobile App — `apps/customer-mobile`) is **FULLY VERIFIED & FROZEN**.

Phase 25 establishes the **Super-Admin Platform Portal (`apps/admin-dashboard`)**: a high-performance, production-grade B2B web application built with **Next.js 14 App Router**, **React 18**, and **TypeScript**. It serves as the primary administrative control center for the entire salon platform, providing macro visibility, governance, and management across all tenants, salons, branches, staff, customers, bookings, payments, inventory, master catalogs, promotions, reviews, notifications, media assets, and system health.

---

## Technical Specifications & Architecture

### 1. Technology Decisions
- **Framework**: Next.js 14 (App Router with route groups `(auth)` and `(dashboard)`)
- **Language**: TypeScript 5.4+ with strict type checking
- **Design System & Styling**: Luxury Dark Command Center theme with vanilla CSS design tokens, glassmorphism, responsive data tables, modal dialogs, and slide-over drawers
- **Token Storage**: `BrowserTokenStorage` in `localStorage` / memory implementing `ITokenStorage` from `@saloon/shared-utils`
- **HTTP Client**: `ApiClient` singleton from `@saloon/shared-utils` (handling 401 refresh queue, Bearer tokens, and unauthenticated redirects)
- **Role-Based Access Control**: `AuthContext` protecting routes with strict `UserRole.SUPER_ADMIN` authorization checks

---

## Core Modules & Administrative Capabilities

1. **Super Admin Authentication & Session**:
   - Email and password login via `POST /api/v1/auth/login`.
   - Token refresh handling via `POST /api/v1/auth/refresh`.
   - Automatic redirection to `/login` for unauthenticated or non-admin users.
2. **Executive Platform Command Center (Dashboard)**:
   - Aggregated platform KPIs: total revenue volume, active bookings, registered customers, salon approval status, inventory valuation, and live infrastructure health.
3. **Salon Governance & Verification Queue**:
   - Status filtering (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SUSPENDED`).
   - Salon profile and branch inspection.
   - One-click approval (`POST /api/v1/admin/salons/:id/approve`) and rejection dialog with mandatory audit reason (`POST /api/v1/admin/salons/:id/reject`).
4. **Platform User & Staff Management**:
   - Cross-platform user search and role modification (with self-demotion prevention).
   - Account suspension (`/api/v1/users/:id/suspend`) and restoration (`/api/v1/users/:id/restore`).
   - Cross-salon staff audit and staff leave approvals.
5. **Customer CRM & Blacklist Oversight**:
   - Platform customer directory with wallet/loyalty points inspection.
   - Blocked and blacklisted customer management.
   - Archived customer profiles and merge audit history.
6. **Global Booking Operations**:
   - Cross-salon booking ledger with date, salon, customer, and status filters.
   - Background expired reservation lock cleanup (`POST /api/v1/admin/bookings/cleanup-expired-locks`).
7. **Financial Auditing, Payments & Webhooks**:
   - Platform-wide payment transaction ledger and failed payment investigations.
   - Global refund tracking.
   - Webhook retry tool (`POST /api/v1/admin/payments/webhooks/retry`).
8. **Master Service Catalog**:
   - Global master category and service definitions management.
   - Branch pricing matrix inspection.
9. **Inventory Macro Oversight**:
   - Platform stock valuation, cross-branch SKU search, movement audit ledgers, purchase orders, transfers, and physical discrepancy audits.
10. **Promotions & Marketing Audit**:
    - Coupon search, coupon usage audit trail, gift card balance liability, flash sales, and marketing campaign metrics.
11. **Review Moderation & Dispute Arbitration**:
    - Moderation queue with hide, publish, reject, and archive actions.
    - Flagged review report resolutions and salon-customer dispute arbitration.
12. **Notification Engine & Broadcast Dispatcher**:
    - Platform template editor with variable render and preview.
    - Direct notifications and mass broadcast dispatcher (`POST /api/v1/admin/notifications/broadcast`).
13. **Media Asset Governance**:
    - Cross-tenant media search with soft-deleted asset toggle.
    - Storage bucket/provider/objectKey metadata inspector and asset restoration.
14. **Platform Health & System Telemetry**:
    - Live infrastructure probes for PostgreSQL, Redis, and S3/R2 storage.
    - Process uptime, memory telemetry, and readiness status.

---

## Verification & Definition of Done

- [ ] Next.js 14 project initialized under `apps/admin-dashboard` and registered in Turborepo
- [ ] Shared monorepo packages (`@saloon/shared-types`, `@saloon/shared-utils`, `@saloon/config`) linked and type-checked
- [ ] Super Admin authentication, session restoration, and RBAC route protection verified
- [ ] All 14 administrative domain service modules implemented with typed `ApiClient`
- [ ] Unit and component test suites in `apps/admin-dashboard/src/tests/` 100% passing
- [ ] TypeScript compilation: `tsc --noEmit` produces 0 errors
- [ ] Backend regression: 245/245 test suites passing (1,678 tests green)
- [ ] Full monorepo production build: `pnpm turbo run build` passes with 0 errors
- [ ] Phases 1–24 remain completely intact and frozen
