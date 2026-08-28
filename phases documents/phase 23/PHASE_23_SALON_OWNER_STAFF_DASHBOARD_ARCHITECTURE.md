# PHASE 23 — SALON OWNER & STAFF WEB DASHBOARD ARCHITECTURE BLUEPRINT

**Status**: COMPLETED, VERIFIED & FROZEN  
**Module**: Phase 23 — Salon Owner & Staff Web Dashboard  
**Scope**: Next.js 14 App Router, TypeScript, Multi-Tenant Session Management, Appointment Calendar, Branch Governance, Treatment Catalog, Staff Shifts, Inventory Tracking, Promotions, Review Moderation, Analytics, and Phase 20 Media Upload Integration  
**Target Platform**: `apps/salon-dashboard` (Next.js 14 / React 18 / TypeScript / Vanilla CSS Design Tokens)

---

## 1. Purpose & Objectives

Phase 23 delivers the primary B2B operational dashboard for salon owners, managers, and staff members. It provides an intuitive, high-performance web interface to govern day-to-day salon operations, schedule customer appointments, supervise multi-branch locations, track inventory levels, review financial performance, and interact with the backend API services established in Phases 1–22.

---

## 2. Technical Stack & Architectural Invariants

### 2.1 Technology Stack
- **Framework**: Next.js 14 (App Router)
- **UI Architecture**: React 18 with Vanilla CSS custom design system (custom properties, glassmorphism)
- **Shared Packages**: `@saloon/shared-types`, `@saloon/shared-utils`, `@saloon/config`
- **Authentication**: JWT token lifecycle managed via `AuthProvider` and `ITokenStorage`
- **Icons**: `lucide-react`
- **Testing**: Jest + React Testing Library

### 2.2 Core Architectural Invariants
1. **Zero Backend Logic Duplication**: Frontend services act as pure consumers of `@saloon/config` `API_ROUTES` and `@saloon/shared-types` DTOs.
2. **Multi-Tenant State Separation**: `SalonContext` maintains tenant isolation by tracking the currently active `salonId` and `selectedBranchId`.
3. **Phase 20 Media Storage Compliance**: All image and document uploads route through the Phase 20 presigned upload handshake via `mediaService`.
4. **Resilient HTTP Communication**: All REST communication uses `ApiClient` with single-flight 401 refresh concurrency management.

---

## 3. Application Directory Structure

```
apps/salon-dashboard/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (AuthProvider, SalonProvider, Header, Sidebar)
│   │   ├── page.tsx                  # Dashboard Overview (KPI Cards, GMV, Occupancy)
│   │   ├── (auth)/
│   │   │   └── login/page.tsx        # Salon Owner/Staff Login Screen
│   │   ├── calendar/page.tsx         # Master Booking Calendar & Appointment Board
│   │   ├── branches/page.tsx         # Multi-Branch Governance, Hours & Closures
│   │   ├── services/page.tsx         # Treatment Catalog & Pricing Manager
│   │   ├── staff/page.tsx            # Stylist Roster, Shifts, Commissions & Leaves
│   │   ├── inventory/page.tsx        # Stock Levels, Purchase Orders & Transfers
│   │   ├── promotions/page.tsx       # Coupon Campaigns & Flash Sales
│   │   ├── customers/page.tsx        # Verified Client Reviews & Salon Replies
│   │   ├── analytics/page.tsx        # Revenue Reports & Stylist Leaderboards
│   │   ├── media/page.tsx            # Phase 20 R2/S3 Direct Upload Gallery
│   │   └── settings/page.tsx         # Business Profile, GSTIN & Legal Information
│   │
│   ├── components/                   # UI Primitives & Domain Widgets
│   │   ├── ui/                       # Button, Card, Input, Select, Badge, Modal, StatCard, EmptyState
│   │   ├── layout/                   # Sidebar, Header, ProtectedRoute
│   │   └── media/                    # MediaUploader (Presigned R2/S3 upload component)
│   │
│   ├── context/                      # Application Contexts
│   │   ├── AuthContext.tsx           # Authentication state, login, logout, token refresh
│   │   └── SalonContext.tsx          # Active salon and branch selector
│   │
│   ├── services/                     # Typed Domain Services
│   │   ├── api-client.ts             # ApiClient singleton
│   │   ├── auth.service.ts
│   │   ├── salon.service.ts
│   │   ├── booking.service.ts
│   │   ├── catalog.service.ts
│   │   ├── staff.service.ts
│   │   ├── inventory.service.ts
│   │   ├── promotions.service.ts
│   │   ├── customer.service.ts
│   │   └── media.service.ts
│   │
│   └── tests/                        # Component & Domain Service Unit Tests
│       ├── components.spec.tsx
│       ├── services.spec.ts
│       └── auth-flow.spec.tsx
```

---

## 4. Key Functional Capabilities

### 4.1 Master Appointment Calendar (`/calendar`)
- Visualizes daily and weekly bookings grouped by stylist or treatment room.
- Instant appointment status updates: `PENDING` → `CONFIRMED` → `CHECKED_IN` → `IN_PROGRESS` → `COMPLETED` or `CANCELLED`.
- Displays service items, customer name, notes, and duration calculations using `@saloon/shared-utils`.

### 4.2 Multi-Branch Administration (`/branches`)
- Configure branch address, state, postal code, and geocoordinates.
- Weekly operating hours matrix with open/close timings and midday break ranges.
- Planned temporary closures and holiday blackout dates.

### 4.3 Treatment Catalog & Pricing (`/services`)
- Hierarchical category and service management.
- Base price, duration minutes, buffer time, and target gender tags.
- Custom branch-specific price overrides.

### 4.4 Stylist & Staff Management (`/staff`)
- Stylist profile management, commission percentages, assigned branches.
- Shift schedules, leave requests, and approval workflow.

### 4.5 Inventory & Stock Control (`/inventory`)
- Real-time stock counts across branch locations.
- Low-stock warning badges.
- Stock adjustments, purchase orders, and inter-branch transfer logging.

### 4.6 Marketing & Promotions (`/promotions`)
- Promo coupon creation with percentage or fixed discount rules.
- Minimum spend rules, usage quotas, and expiry dates.

### 4.7 Phase 20 Direct Media Uploader (`/media`)
- Integrated `MediaUploader` component executing client-direct presigned uploads:
  1. Requests presigned upload URL from `POST /api/v1/media/upload/presigned`.
  2. Uploads file buffer directly to cloud storage (R2/S3) with progress tracking.
  3. Confirms completion with `POST /api/v1/media/upload/:id/finalize`.

---

## 5. Verification & Test Metrics

| Test Suite | Location | Tests | Status |
|---|---|---|---|
| UI Component Primitives | `src/tests/components.spec.tsx` | 4 tests | ✅ Passed |
| Domain Service Integration | `src/tests/services.spec.ts` | 4 tests | ✅ Passed |
| Authentication & Route Guard | `src/tests/auth-flow.spec.tsx` | 2 tests | ✅ Passed |
| Next.js Static Build | `pnpm build` | 14/14 static pages | ✅ Passed |
| TypeScript Compiler Check | `tsc --noEmit` | 0 errors | ✅ Passed |
