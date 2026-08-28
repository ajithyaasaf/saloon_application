# PHASE_8_USER_MANAGEMENT_ARCHITECTURE.md
## Phase 8.0 – User Management Module: Architecture & Implementation Plan

> **Status**: SCHEMA STRATEGY APPROVED — AWAITING FULL ARCHITECTURE SIGN-OFF
> **Author Role**: Lead Backend Architect
> **Date**: 2026-08-06 (Revised: 2026-08-06 — Schema strategy approved, UserAddress reservation added)
> **Depends On**: Phase 7 (Authentication – Frozen)
> **Blocks**: Phase 8.1 – DTO Layer

---

## 1. Module Overview

The **User Management** module is the profile and account lifecycle layer that sits directly above the Authentication module. It manages everything that happens to a `User` record after the user has been authenticated.

Authentication is responsible for **who you are** (identity, session, tokens).
User Management is responsible for **what you look like** (profile), **what you prefer** (preferences), and **what state you are in** (active, suspended, deleted).

### Boundary Contract

| Concern | Owner |
|---------|-------|
| Login / OTP / Tokens / Sessions | `AuthModule` (Frozen) |
| Profile reads and updates | `UserModule` (this phase) |
| Avatar upload | `UserModule` → Cloudinary |
| Email / Phone change + verification | `UserModule` |
| Account suspension / deletion | `UserModule` (Admin-only paths) |
| Role assignment | `UserModule` (Super Admin only) |
| Staff-specific profile fields | `StaffModule` (future Phase) |

---

## 2. Responsibilities

The `UserModule` is responsible for:

1. **Profile Management** — read, update, and patch the `User` record fields that are safe for users to change themselves (name, display name, gender, DOB, notification preferences).
2. **Avatar Management** — upload profile picture to Cloudinary, store reference in `Media` table, update `User.avatarMediaId`, handle replacement and cleanup.
3. **Email Management** — attach/change email address with re-verification via a time-limited token sent to the new email.
4. **Phone Management** — change phone number with OTP re-verification to the new phone.
5. **Account Lifecycle** — Super Admin can suspend, restore, and soft-delete accounts. Users can initiate self-deletion with a confirmation token.
6. **Admin User Listing** — Super Admin and Support Agent can list, search, filter, and view any user.
7. **Audit Logging** — every mutation is written to `audit_logs` using `AuditAction.UPDATE` or `AuditAction.DELETE`.

---

## 3. Folder Structure

```
src/domains/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
│
├── dto/
│   ├── update-profile.dto.ts
│   ├── update-preferences.dto.ts
│   ├── change-email.dto.ts
│   ├── verify-email.dto.ts
│   ├── change-phone.dto.ts
│   ├── verify-phone.dto.ts
│   ├── admin-list-users.dto.ts
│   ├── admin-update-user.dto.ts
│   ├── user-profile.dto.ts          ← response DTO
│   └── user-summary.dto.ts          ← response DTO (paginated list)
│
├── repositories/
│   └── user.repository.ts
│
└── tests/
    ├── users.controller.spec.ts
    └── users.service.spec.ts
```

> **Convention**: Matches the `auth/` domain structure established in Phase 7.
> Test files are co-located in a `tests/` subdirectory within the domain.

---

## 4. Service Breakdown

### `UserService`

Single service, thin methods, zero HTTP context. All methods receive primitive arguments — no HTTP request objects, no `Response`, no `Headers`.

| Method | Caller | Description |
|--------|--------|-------------|
| `getMyProfile(userId)` | Controller | Returns full `UserProfileDto` for the authenticated user |
| `updateMyProfile(userId, dto, ipAddress)` | Controller | Updates mutable profile fields (name, DOB, gender, display name) |
| `updateMyPreferences(userId, dto, ipAddress)` | Controller | Updates notification preferences, preferred language, timezone |
| `requestAvatarUpload(userId, file, ipAddress)` | Controller | Validates, uploads to Cloudinary, updates `avatarMediaId`, deletes old Media row |
| `removeAvatar(userId, ipAddress)` | Controller | Sets `avatarMediaId = null`, deletes old Media row from Cloudinary + DB |
| `requestEmailChange(userId, dto, ipAddress)` | Controller | Sends verification token to the new email address |
| `verifyEmailChange(userId, dto, ipAddress)` | Controller | Confirms token, updates `User.email`, sets `emailVerified = true` |
| `requestPhoneChange(userId, dto, ipAddress)` | Controller | Sends OTP to the new phone number |
| `verifyPhoneChange(userId, dto, ipAddress)` | Controller | Confirms OTP, updates `User.phone`, sets `phoneVerified = true` |
| `getUserById(requesterId, targetUserId)` | Controller (Admin) | Admin/Support reads any user profile |
| `listUsers(requesterId, dto)` | Controller (Admin) | Paginated, filtered user list for admin panel |
| `adminUpdateUser(requesterId, targetUserId, dto, ipAddress)` | Controller (Admin) | Admin patches role, isActive, etc. |
| `suspendUser(adminId, targetUserId, ipAddress)` | Controller (Admin) | Sets `isActive = false`, revokes all sessions |
| `restoreUser(adminId, targetUserId, ipAddress)` | Controller (Admin) | Sets `isActive = true` |
| `softDeleteUser(adminId, targetUserId, ipAddress)` | Controller (Admin) | Sets `deletedAt`, revokes all sessions, audit logged |
| `requestSelfDeletion(userId, ipAddress)` | Controller | Sends confirmation token to user; does not delete immediately |
| `confirmSelfDeletion(userId, token, ipAddress)` | Controller | Validates token, soft-deletes account, revokes all sessions |

**Private helpers** (extracted, not exposed):
- `buildUserProfileDto(user, avatarMedia?)` — constructs response DTO from DB row
- `resolveAvatar(avatarMediaId?)` — fetches Media row or returns null
- `writeAuditLog(actorId, role, action, entityId, old?, new?, ip?)` — wraps `prisma.auditLog.create()`
- `invalidateUserSessions(userId)` — delegates to `SessionRepository.revokeAllUserSessions()`

### Interaction with `AuthModule`

`UserModule` imports `AuthModule` to consume:
- `SessionRepository` — for session revocation on suspension/deletion
- `AuthService` is **NOT** imported. Session operations go through `SessionRepository` directly.

---

## 5. Repository Responsibilities

### `UserRepository extends BaseRepository`

Owns all Prisma queries against the `users` table and the `media` table as it relates to avatars. Contains zero business logic.

| Method | Description |
|--------|-------------|
| `findById(id, tx?)` | PK lookup, returns `User or null` |
| `findByEmail(email, tx?)` | Unique email lookup |
| `findByPhone(phone, tx?)` | Unique phone lookup |
| `updateProfile(id, data, tx?)` | Patches mutable profile fields |
| `updateEmail(id, email, tx?)` | Updates `email`, sets `emailVerified = true` |
| `updatePhone(id, phone, tx?)` | Updates `phone`, sets `phoneVerified = true` |
| `updateAvatar(id, avatarMediaId, tx?)` | Sets `User.avatarMediaId` |
| `clearAvatar(id, tx?)` | Sets `User.avatarMediaId = null` |
| `setActive(id, isActive, tx?)` | Sets `isActive` |
| `softDelete(id, tx?)` | Sets `deletedAt = now()` |
| `restore(id, tx?)` | Sets `deletedAt = null`, `isActive = true` |
| `incrementVersion(id, tx?)` | Increments `version` |
| `listUsers(filters, pagination, tx?)` | Paginated, filtered admin list |
| `createMedia(data, tx?)` | Inserts a `Media` row for uploaded avatar |
| `deleteMedia(id, tx?)` | Deletes a `Media` row |
| `findMedia(id, tx?)` | Looks up a `Media` row by ID |

---

## 6. DTO List

### Request DTOs

| DTO | Fields |
|-----|--------|
| `UpdateProfileDto` | `firstName?`, `lastName?`, `displayName?`, `gender?`, `dateOfBirth?` |
| `UpdatePreferencesDto` | `preferredLanguage?`, `timezone?`, `notificationChannels?`, `marketingOptIn?` |
| `ChangeEmailDto` | `newEmail` |
| `VerifyEmailDto` | `token` |
| `ChangePhoneDto` | `newPhone` |
| `VerifyPhoneDto` | `otp` (6-digit string) |
| `AdminListUsersDto` | `page?`, `limit?`, `role?`, `isActive?`, `search?`, `sortBy?`, `sortDir?` |
| `AdminUpdateUserDto` | `isActive?`, `role?`, `firstName?`, `lastName?` |

### Response DTOs

| DTO | Fields |
|-----|--------|
| `UserProfileDto` | All safe public fields: `id`, `firstName`, `lastName`, `displayName?`, `email?`, `emailVerified`, `phone`, `phoneVerified`, `role`, `isActive`, `gender?`, `dateOfBirth?`, `avatarUrl?`, `preferredLanguage?`, `timezone?`, `notificationChannels?`, `marketingOptIn`, `createdAt` |
| `UserSummaryDto` | `id`, `firstName`, `lastName`, `email?`, `phone`, `role`, `isActive`, `createdAt` — for paginated admin lists |

> **Serialization**: All response DTOs use `@Exclude()` / `@Expose()` to prevent accidental exposure of `passwordHash`, `version`, `deletedAt`, `avatarMediaId` (raw FK), `createdById`, `updatedById`.

---

## 7. Validation Rules

### Name Fields

| Field | Rule |
|-------|------|
| `firstName` | 2–50 characters, letters and spaces only |
| `lastName` | Optional, 1–50 characters, same character set |
| `displayName` | Optional, 2–60 characters, alphanumeric, spaces, hyphens, underscores |

### Email

| Rule | Detail |
|------|--------|
| Format | RFC 5321 compliant, validated via `@IsEmail()` |
| Uniqueness | Checked before dispatching verification token using a generic response to prevent enumeration |
| Normalization | Lowercased and trimmed before persistence |
| Change constraint | Cannot change to an email already in use by another active account |

### Phone

| Rule | Detail |
|------|--------|
| Format | 10-digit Indian mobile number or with `+91` prefix (normalized to 10-digit internally) |
| Uniqueness | Verified against `users.phone` before dispatching OTP |
| OTP | 6-digit, bcrypt hashed in Redis, 5-minute TTL, max 3 attempts |
| Change constraint | Cannot change to a phone already linked to another account |

### Date of Birth

| Rule | Detail |
|------|--------|
| Format | ISO 8601 date string (YYYY-MM-DD) |
| Range | User must be 13 years or older; maximum 120 years old |
| Optional | Field is nullable; no DOB required |

### Gender

| Rule | Detail |
|------|--------|
| Enum | `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY` |
| Optional | Nullable field |

### Profile Image

| Rule | Detail |
|------|--------|
| Max file size | 5 MB |
| Accepted MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Validation method | Content inspection (magic bytes), not MIME header only |
| Field name | `avatar` |

### Admin Pagination

| Field | Rule |
|-------|------|
| `page` | Integer >= 1, default 1 |
| `limit` | Integer 1–100, default 20 |
| `sortBy` | Enum: `createdAt`, `firstName`, `role` |
| `sortDir` | Enum: `asc`, `desc` |

---

## 8. API Design

All routes are under `/api/v1/users`.

### 8.1 — Self-Service Endpoints (Authenticated User)

| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| `GET` | `/users/me` | `JwtAuthGuard` | Get authenticated user's full profile |
| `PATCH` | `/users/me/profile` | `JwtAuthGuard` | Update name, display name, gender, DOB |
| `PATCH` | `/users/me/preferences` | `JwtAuthGuard` | Update language, timezone, notification prefs, marketing opt-in |
| `POST` | `/users/me/avatar` | `JwtAuthGuard` | Upload or replace profile picture (multipart/form-data) |
| `DELETE` | `/users/me/avatar` | `JwtAuthGuard` | Remove profile picture |
| `POST` | `/users/me/email/request` | `JwtAuthGuard` | Request email change; dispatches verification email |
| `POST` | `/users/me/email/verify` | `JwtAuthGuard` | Confirm email change with token |
| `POST` | `/users/me/phone/request` | `JwtAuthGuard` | Request phone change; dispatches OTP via SMS |
| `POST` | `/users/me/phone/verify` | `JwtAuthGuard` | Confirm phone change with OTP |
| `POST` | `/users/me/delete/request` | `JwtAuthGuard` | Initiate self-deletion; dispatches confirmation token |
| `POST` | `/users/me/delete/confirm` | `JwtAuthGuard` | Confirm self-deletion with token; soft-deletes account |

### 8.2 — Admin Endpoints

> Protected by `JwtAuthGuard` + `@Roles(UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT)` unless noted.

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/users` | `SUPER_ADMIN`, `SUPPORT_AGENT` | Paginated user list with filters |
| `GET` | `/users/:userId` | `SUPER_ADMIN`, `SUPPORT_AGENT` | Get any user's profile by ID |
| `PATCH` | `/users/:userId` | `SUPER_ADMIN` only | Admin update (role, isActive) |
| `POST` | `/users/:userId/suspend` | `SUPER_ADMIN` only | Suspend account + revoke sessions |
| `POST` | `/users/:userId/restore` | `SUPER_ADMIN` only | Restore suspended account |
| `DELETE` | `/users/:userId` | `SUPER_ADMIN` only | Soft-delete account |

### 8.3 — HTTP Status Codes

| Code | Condition |
|------|-----------|
| `200 OK` | Successful GET, PATCH, DELETE |
| `400 Bad Request` | Validation failure |
| `401 Unauthorized` | Missing or invalid JWT |
| `403 Forbidden` | Role insufficient |
| `404 Not Found` | User not found or soft-deleted |
| `409 Conflict` | Email or phone already in use by another account |
| `413 Payload Too Large` | Avatar file exceeds 5 MB |
| `422 Unprocessable Entity` | Business rule violation (e.g. DOB under 13) |
| `429 Too Many Requests` | Rate limit exceeded |

---

## 9. Security Design

### 9.1 — Ownership Enforcement

Every self-service mutation resolves the target user from `JwtPayload.sub`. Users can never supply a `userId` parameter to mutate another account. All admin endpoints validate that the requesting user's role permits the operation before any DB call.

### 9.2 — Sensitive Field Protection

| Field | Protection |
|-------|-----------|
| `passwordHash` | Excluded from all DTOs via `@Exclude()` |
| `avatarMediaId` | Never returned (raw FK); `avatarUrl` returned instead |
| `version` | Never returned |
| `deletedAt`, `createdById`, `updatedById` | Never returned |
| `email` | Only returned in `UserProfileDto` for the owner and admin views |
| `phone` | Same as email |

### 9.3 — Email and Phone Change Anti-Enumeration

`requestEmailChange()` and `requestPhoneChange()` return identical generic success responses regardless of whether the new email/phone is already taken. The uniqueness conflict is only revealed after token/OTP confirmation, where the user is already authenticated.

### 9.4 — Rate Limiting

| Operation | Limit |
|-----------|-------|
| Email change request | 3 per hour per user |
| Phone OTP request | 3 per 15 minutes per user |
| Avatar upload | 10 per hour per user |
| Self-deletion confirmation | 1 active token at a time |

### 9.5 — Avatar Security

- File type validated by **content inspection** (magic bytes), not just MIME type header.
- Cloudinary upload uses a **signed upload preset** — no unsigned uploads.
- Old `Media` row and Cloudinary asset are **deleted after successful replacement**.
- Avatar URL served from Cloudinary CDN via HTTPS only.

### 9.6 — PII Handling

- `User.phone`, `User.email`, `User.dateOfBirth` are PII. They are:
  - Never logged in plain text.
  - Never included in error messages.
  - Only written to `audit_logs` for admin mutations, in masked form.
- Soft-deleted users retain their row. A future GDPR erasure workflow will fully anonymize PII fields.

### 9.7 — Authorization Matrix

| Endpoint Group | CUSTOMER | SALON_OWNER | SALON_STAFF | SUPER_ADMIN | SUPPORT_AGENT |
|---------------|----------|-------------|-------------|-------------|---------------|
| View own profile | YES | YES | YES | YES | YES |
| Update own profile | YES | YES | YES | YES | YES |
| Upload avatar | YES | YES | YES | YES | YES |
| Change email | YES | YES | YES | YES | YES |
| Change phone | YES | YES | YES | YES | YES |
| Self-delete | YES | YES | YES | YES | YES |
| List all users | NO | NO | NO | YES | YES |
| View any user | NO | NO | NO | YES | YES |
| Admin patch user | NO | NO | NO | YES | NO |
| Suspend / Restore | NO | NO | NO | YES | NO |
| Soft-delete user | NO | NO | NO | YES | NO |

---

## 10. File Upload Strategy

### 10.1 — Cloudinary Integration

The platform already configures Cloudinary in `AppModule` via `cloudinaryConfig`. `UserModule` will consume this config through `ConfigService` to initialize the Cloudinary SDK.

**Upload flow:**

```
Client (multipart/form-data, field: avatar)
    ↓
NestJS FileInterceptor (multer, memoryStorage)
    ↓
UserService.requestAvatarUpload()
    validate MIME type (magic bytes), file size
    ↓
Cloudinary SDK upload (signed preset)
    folder: users/avatars/
    returns { url, thumbnailUrl, publicId, format, bytes }
    ↓
prisma.media.create() — stores Media row
    ↓
prisma.user.update() { avatarMediaId }
    ↓
if (previousAvatarMediaId exists) {
    cloudinary.uploader.destroy(previousPublicId)
    prisma.media.delete({ where: { id: previousAvatarMediaId } })
}
    ↓
Return UserProfileDto with new avatarUrl
```

### 10.2 — Cloudinary Transformations

On upload, apply eager transformations to pre-generate two sizes:
- **Standard**: `w_400,h_400,c_fill,g_face,q_auto,f_auto`
- **Thumbnail**: `w_80,h_80,c_fill,g_face,q_auto,f_auto`

Both URLs stored in the `Media` row (`url` and `thumbnailUrl`) per the existing schema.

### 10.3 — Cleanup Strategy

| Event | Action |
|-------|--------|
| New avatar replaces old | Delete old `Media` row; destroy old Cloudinary asset |
| Avatar removed by user | Delete `Media` row; destroy Cloudinary asset |
| Account soft-deleted | Avatar retained; removed as part of future GDPR erasure |
| Account hard-deleted (future GDPR) | All associated `Media` rows deleted; Cloudinary assets purged |

### 10.4 — Multer Configuration

| Setting | Value |
|---------|-------|
| Storage | `memoryStorage()` — no disk writes |
| Max file size | 5 MB (5,242,880 bytes) |
| Accepted types | `image/jpeg`, `image/png`, `image/webp` |
| Field name | `avatar` |

---

## 11. Audit Logging

All audit events are written to the `audit_logs` table using the existing `AuditAction` enum and the same `createAuditLog()` pattern established in `AuthService`.

| Event | `action` | `entityType` | Notes |
|-------|----------|-------------|-------|
| Profile updated | `UPDATE` | `User` | `oldValueJson` / `newValueJson` contain changed fields only |
| Email changed | `UPDATE` | `User` | `{ field: 'email', old: masked, new: masked }` |
| Phone changed | `UPDATE` | `User` | `{ field: 'phone', old: masked, new: masked }` |
| Avatar uploaded | `UPDATE` | `User` | `{ event: 'AVATAR_UPDATED', mediaId }` |
| Avatar removed | `UPDATE` | `User` | `{ event: 'AVATAR_REMOVED' }` |
| Account suspended | `UPDATE` | `User` | Admin-performed; `newValueJson` includes `adminId` |
| Account restored | `UPDATE` | `User` | Admin-performed |
| Account soft-deleted | `DELETE` | `User` | `{ reason: 'SELF_DELETION' or 'ADMIN_ACTION' }` |
| Role changed | `UPDATE` | `User` | Admin-only; `{ old_role, new_role }` |

> **PII masking**: Phone and email stored in audit log as `***last4` format. Never stored in plain text.

---

## 12. Future Scalability

The User Management module is designed to serve as the foundation for every future module.

| Future Module / Entity | How `UserModule` Supports It |
|------------------------|------------------------------|
| **Salon Module** | `User.id` is the `ownerId` FK on `Salon`. `UserModule` exports `UserRepository` for cross-domain use |
| **Staff Module** | `Staff.userId` links to `User.id`. Staff profile fields managed by `StaffModule`; identity fields by `UserModule` |
| **Booking Module** | `Appointment.customerId` references `User.id`. Customer profile pulled via `UserRepository` |
| **Notifications Module** | `User.marketingOptIn` and the future `UserPreferences` table inform notification delivery strategy |
| **Reviews Module** | `Review.customerId` references authenticated `User.id` |
| **GDPR Erasure** | `softDeleteUser()` and `deletedAt` provide the foundation for a future anonymization job |
| **Multi-language** | `User.preferredLanguage` provides per-user locale for i18n of notifications and UI |
| **Analytics** | `createdAt`, `role`, `isActive` are indexed and available for reporting |
| **UserPreferences Table** *(reserved)* | A dedicated `user_preferences` table (1:1 with `User`) will own all notification channel preferences, push tokens, and granular communication settings when the Notifications module matures. `notificationChannels` is intentionally NOT added to `users` to avoid schema bloat and future migration complexity. |
| **UserAddress Table** *(reserved)* | A dedicated `user_addresses` table (1:N with `User`) is reserved for future features including home salon services (at-home booking), billing addresses, saved delivery locations, and geofence-based service availability. The table is NOT created in Phase 8. It will be designed and migrated as part of the Home Services or Booking Address phase. Anticipated fields: `id`, `userId`, `label` (e.g. Home / Work), `addressLine1`, `addressLine2`, `city`, `state`, `pincode`, `latitude`, `longitude`, `isDefault`, `createdAt`. |

---

## 13. Schema Gap Analysis

> [!CAUTION]
> **STOP — Schema Change Required Before Phase 8.1 Can Begin**

A full review of the approved `schema.prisma` (Phase 4) against the User Management requirements reveals that the following fields are **not present** in the current `User` model.

### Approved Schema Changes — Fields to Add to `User` Model

> [!IMPORTANT]
> **Architect Decision (2026-08-06 — APPROVED)**: Add the following 6 fields to the `User` model in `schema.prisma`. `notificationChannels` is explicitly **excluded** from this migration and reserved for the future `UserPreferences` table.

| Field | Prisma Type | DB Column | Purpose | Nullable | Default |
|-------|------------|-----------|---------|----------|---------|
| `displayName` | `String?` | `display_name` | Optional user-facing display name separate from firstName + lastName | Yes | `null` |
| `gender` | `Gender?` | `gender` | User-selected gender identity (new enum) | Yes | `null` |
| `dateOfBirth` | `DateTime?` | `date_of_birth @db.Date` | Age verification and personalization | Yes | `null` |
| `preferredLanguage` | `String?` | `preferred_language` | ISO 639-1 language code (e.g. `en`, `hi`, `ta`); max 10 chars | Yes | `null` |
| `timezone` | `String?` | `timezone` | IANA timezone string (e.g. `Asia/Kolkata`); max 60 chars | Yes | `null` |
| `marketingOptIn` | `Boolean` | `marketing_opt_in` | Marketing communication consent (GDPR/DPDP compliance) | No | `false` |

### New Enum to Add to Schema

```prisma
enum Gender {
  MALE
  FEMALE
  OTHER
  PREFER_NOT_TO_SAY

  @@map("enum_gender")
}
```

### Explicitly Excluded Field

| Field | Decision | Reason |
|-------|----------|--------|
| `notificationChannels` | **NOT ADDED** | Notification preferences are expected to become significantly more granular (per-channel, per-event-type, quiet hours, frequency caps). Adding a flat array to `users` now would require a breaking migration later. Reserved for a dedicated `user_preferences` table in a future phase. |

### Future Reserved Tables (Not Created in Phase 8)

| Table | Purpose | Phase |
|-------|---------|-------|
| `user_preferences` | Per-user notification channel opt-ins, push tokens, quiet hours, frequency preferences | Future Notifications Phase |
| `user_addresses` | Saved addresses for home salon services, billing, and delivery (see Section 12) | Future Home Services / Booking Address Phase |

### Existing Fields Confirmed Present

| Field | Status |
|-------|--------|
| `firstName`, `lastName` | Present |
| `email`, `emailVerified` | Present |
| `phone`, `phoneVerified` | Present |
| `avatarMediaId` | Present (FK to `Media`) |
| `isActive` | Present |
| `deletedAt` | Present (soft delete) |
| `role` | Present |
| `version` | Present |
| `Media` model | Present (`url`, `thumbnailUrl`, `publicId`, `mimeType`, `fileSize`) |
| `AuditLog` model | Present |

---

## 14. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| R-1 | Cloudinary upload failure leaves a `Media` row orphaned | Low | Medium | Wrap upload + DB insert in try/catch; delete Media row on Cloudinary failure |
| R-2 | Concurrent avatar uploads from same user create duplicate `Media` rows | Low | Low | Redis idempotency key per upload prevents duplicate submissions |
| R-3 | Email/phone change has a TOCTOU window between uniqueness check and update | Medium | Medium | Use Prisma transaction; uniqueness constraint on DB catches concurrent conflict |
| R-4 | Self-deletion confirmation token replay | Low | High | Single-use token; delete from Redis immediately on first valid use |
| R-5 | Admin soft-delete does not revoke active sessions | Low | High | `softDeleteUser()` must call `SessionRepository.revokeAllUserSessions()` atomically |
| R-6 | `timezone` field accepts arbitrary strings — invalid IANA codes cannot be caught by DB constraint | Low | Low | Validate against a curated IANA timezone list in the DTO layer using a custom validator |
| R-7 | `preferredLanguage` accepts arbitrary strings — invalid locale codes cannot be caught by DB | Low | Low | Validate against ISO 639-1 allowlist in the DTO layer |

---

## 15. Approval Checklist

Before Phase 8.1 (DTO Layer) begins, all of the following must be confirmed by the architect and product owner:

- [x] **Schema strategy approved**: Add `displayName`, `gender`, `dateOfBirth`, `preferredLanguage`, `timezone`, `marketingOptIn` to `User` model. `notificationChannels` explicitly excluded. *(Approved 2026-08-06)*
- [x] **`notificationChannels` deferred**: Reserved for future `user_preferences` table. NOT added to `users`. *(Approved 2026-08-06)*
- [x] **`UserAddress` reservation acknowledged**: `user_addresses` table reserved for Home Services / Booking Address phase. NOT created in Phase 8. *(Approved 2026-08-06)*
- [ ] **Migration approved**: Schema migration for the 6 approved fields + `Gender` enum drafted, reviewed, and approved before execution
- [ ] **Cloudinary configuration confirmed**: Signed upload preset for `users/avatars/` folder is configured in the Cloudinary dashboard
- [ ] **Full architecture approved**: All 15 sections of this document reviewed and approved
- [ ] **No modifications to AuthModule**: Confirmed — `UserModule` does not touch any auth file
- [ ] **API design approved**: All 17 REST endpoints (11 self-service + 6 admin) reviewed and approved
- [ ] **Authorization matrix approved**: Role permissions table in Section 9.7 confirmed

---

*End of PHASE_8_USER_MANAGEMENT_ARCHITECTURE.md*
*Phase 8.1 – DTO Layer begins only after explicit approval.*
