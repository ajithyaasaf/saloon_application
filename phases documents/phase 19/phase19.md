# PHASE 19 — NOTIFICATIONS & COMMUNICATION ENGINE

## Background

Phase 18 (Promotions & Marketing Engine) is **FULLY VERIFIED & FROZEN** — 25 test suites, 151 tests, all passing.

Phase 19 builds the **Notifications & Communication Engine**: a production-grade, multi-channel notification domain covering SMS (Twilio), Email (SMTP/SendGrid), Push Notifications (Firebase FCM), WhatsApp, and In-App notifications — with template management, user preference control, delivery tracking, and retry logic.

## What Already Exists (Do Not Duplicate)

| Component | Location | Status |
|---|---|---|
| `NotificationChannel` enum | `schema.prisma:146` | ✅ Exists |
| `NotificationStatus` enum | `schema.prisma:155` | ✅ Exists |
| `NotificationTemplate` model | `schema.prisma:1734` | ✅ Exists (minimal) |
| `Notification` model | `schema.prisma:1747` | ✅ Exists (minimal) |
| `NotificationDelivery` model | `schema.prisma:1763` | ✅ Exists (minimal) |
| `SharedNotificationModule` | `src/shared/notification/` | ✅ Exists (queue dispatch only) |
| Queue constants (EMAIL/SMS/PUSH/WHATSAPP) | `queues.constant.ts` | ✅ Exists |

## What Needs to Be Built

### Phase 19.1 — Database Schema Extensions
Augment the existing minimal schema with production-grade fields:
- **`NotificationTemplate`**: add `salonId` (nullable for platform-wide), `description`, `variables` (JSON schema), `category`, `createdAt/updatedAt/deletedAt`
- **`Notification`**: add `salonId`, `channel`, `priority`, `scheduledAt`, `idempotencyKey`, `metadata` (JSON), `updatedAt`
- **`NotificationDelivery`**: add `providerMessageId`, `deliveredAt`, `externalMetadata` (JSON), `nextRetryAt`, `createdAt`, `updatedAt`
- **New model: `UserNotificationPreference`**: per-user per-channel opt-in/opt-out + quiet hours
- **New enum: `NotificationPriority`**: `LOW`, `NORMAL`, `HIGH`, `CRITICAL`
- **New enum: `NotificationCategory`**: `BOOKING`, `PAYMENT`, `PROMOTIONS`, `REMINDERS`, `SYSTEM`, `MARKETING`

### Phase 19.2 — Repository Layer
New repository interfaces + Prisma implementations:
- `NotificationTemplateRepository` — CRUD, findByCode, findByChannel, findBySalon
- `NotificationRepository` — create, findById, findByUser, findBySalon, markRead, markAllRead, countUnread
- `NotificationDeliveryRepository` — create, update status/metadata, findPendingRetries, findByNotification
- `UserNotificationPreferenceRepository` — upsert, findByUser, findByUserAndChannel

### Phase 19.3 — Domain Entities & Business Services
- `NotificationTemplateEntity` — template management, variable validation, active/inactive
- `NotificationEntity` — notification lifecycle (created → scheduled → dispatched → delivered/failed)
- `NotificationDeliveryEntity` — delivery attempt tracking, retry backoff
- `UserNotificationPreferenceEntity` — opt-in/opt-out, quiet hours validation
- **`NotificationTemplateService`** — template CRUD, variable interpolation, preview rendering
- **`NotificationPreferenceService`** — user preference management, opt-in/opt-out, quiet hours
- **`NotificationDispatchService`** — orchestrates multi-channel dispatch via QueueService, respects preferences, idempotency
- **`NotificationInboxService`** — user notification inbox (list, mark read, delete), unread count

### Phase 19.4 — Controllers & API Layer
- `NotificationAdminController` — platform admin: template CRUD, broadcast, system notifications
- `NotificationOwnerController` — salon owner: send to customers, view delivery logs, custom templates
- `NotificationCustomerController` — customer inbox: list notifications, mark read, delete, preferences
- `NotificationPreferenceController` — user preference management (opt-in/out per channel)

### Phase 19.5 — E2E Integration, Tests & Module Wiring
- Repository spec files (4 files)
- Service spec files (4 files)
- Controller spec files (4 files)
- Integration spec covering: template rendering, cross-channel dispatch, preference enforcement, quiet hours, tenant isolation, idempotency deduplication
- Wire `NotificationsModule` into `app.module.ts`
- Upgrade `SharedNotificationModule` to reference domain repositories

---

## Proposed Changes

### Database Package

#### [MODIFY] [schema.prisma](file:///g:/Godivatech/Products/saloon/packages/database/prisma/schema.prisma)
- Add `NotificationPriority` enum
- Add `NotificationCategory` enum
- Extend `NotificationTemplate` model with `salonId`, `description`, `variables`, `category`, `createdAt`, `updatedAt`, `deletedAt`
- Extend `Notification` model with `salonId`, `channel`, `priority`, `category`, `scheduledAt`, `idempotencyKey`, `metadata`, `updatedAt`
- Extend `NotificationDelivery` model with `providerMessageId`, `deliveredAt`, `externalMetadata`, `nextRetryAt`, `createdAt`, `updatedAt`
- Add new `UserNotificationPreference` model

---

### Notifications Domain

#### [NEW] `src/domains/notifications/` (entire domain)

**Entities:**
- `notification-template.entity.ts`
- `notification.entity.ts`
- `notification-delivery.entity.ts`
- `user-notification-preference.entity.ts`

**Repositories (interfaces + implementations):**
- `repositories/interfaces/notification-template.repository.interface.ts`
- `repositories/interfaces/notification.repository.interface.ts`
- `repositories/interfaces/notification-delivery.repository.interface.ts`
- `repositories/interfaces/user-notification-preference.repository.interface.ts`
- `repositories/notification-template.repository.ts`
- `repositories/notification.repository.ts`
- `repositories/notification-delivery.repository.ts`
- `repositories/user-notification-preference.repository.ts`

**Services:**
- `services/notification-template.service.ts`
- `services/notification-preference.service.ts`
- `services/notification-dispatch.service.ts`
- `services/notification-inbox.service.ts`

**DTOs:**
- `dto/notification-template.dto.ts`
- `dto/notification.dto.ts`
- `dto/notification-preference.dto.ts`
- `dto/search-notification.dto.ts`

**Controllers:**
- `controllers/notification-admin.controller.ts`
- `controllers/notification-owner.controller.ts`
- `controllers/notification-customer.controller.ts`
- `controllers/notification-preference.controller.ts`

**Events:**
- `events/notification.events.ts`

**Tests (unit + integration):**
- `tests/notification-template.repository.spec.ts`
- `tests/notification.repository.spec.ts`
- `tests/notification-delivery.repository.spec.ts`
- `tests/user-notification-preference.repository.spec.ts`
- `tests/notification-template.service.spec.ts`
- `tests/notification-preference.service.spec.ts`
- `tests/notification-dispatch.service.spec.ts`
- `tests/notification-inbox.service.spec.ts`
- `tests/notifications-integration.spec.ts`
- `controllers/tests/notification-admin.controller.spec.ts`
- `controllers/tests/notification-owner.controller.spec.ts`
- `controllers/tests/notification-customer.controller.spec.ts`
- `controllers/tests/notification-preference.controller.spec.ts`

**Module:**
- `notifications.module.ts`

---

### App Module Wiring

#### [MODIFY] [app.module.ts](file:///g:/Godivatech/Products/saloon/apps/api/src/app.module.ts)
- Import and register `NotificationsModule`

---

## Architecture Decisions

1. **Separation from SharedNotificationModule**: The existing `SharedNotificationModule` dispatches to queues (a transport concern). The new `NotificationsModule` domain handles template management, user preferences, delivery tracking, and inbox — these are domain concerns. They will integrate cleanly.

2. **Template System**: Templates are stored in DB (not file system), allowing runtime management. They use `{{variable_name}}` interpolation. Salon owners can create custom templates; platform admins manage system-wide defaults.

3. **Preference Enforcement**: Before dispatching, `NotificationDispatchService` checks `UserNotificationPreference` to skip opted-out channels and respect quiet hours (e.g., 22:00–08:00).

4. **Idempotency**: `Notification.idempotencyKey` prevents duplicate notifications for the same event (e.g., booking confirmed).

5. **Delivery Tracking**: `NotificationDelivery` records are created per channel attempt. Failed deliveries with `retryCount < 3` get scheduled retries via BullMQ's delayed jobs.

6. **Tenant Isolation**: `salonId` on `NotificationTemplate` and `Notification`. Platform-wide templates have `salonId = null`. Salon owners see only their own templates and logs.

---

## Verification Plan

### Automated Tests
```bash
pnpm --filter api test notifications
```
- Target: **25+ test suites**, **150+ tests**, all passing

### Build Check
```bash
pnpm --filter api build
```

### Manual Verification
- API routes available at `GET /api/v1/notifications/inbox`
- Template CRUD at `POST /api/v1/admin/notification-templates`
- Preference management at `PUT /api/v1/notifications/preferences`

---

> [!IMPORTANT]
> The existing `NotificationTemplate`, `Notification`, and `NotificationDelivery` models in `schema.prisma` are **extended** (not replaced). The existing `SharedNotificationModule` is **preserved** and the new domain module builds on top of it.
