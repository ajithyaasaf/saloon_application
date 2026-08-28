# PHASE 20 — FILES, MEDIA & DOCUMENT MANAGEMENT ENGINE

## Background

Phase 19 (Notifications & Communication Engine) is **FULLY VERIFIED & FROZEN** — all test suites passing, production build verified.

Phase 20 builds the **Files, Media & Document Management Engine**: a production-grade, multi-tenant media and asset domain covering storage provider abstraction (Cloudinary, Cloudflare R2 / AWS S3, Local Disk), file assets (`FileAsset`), polymorphic cross-domain references (`FileReference`), presigned direct uploads, signed URL access control, image validation, and complete tenant isolation.

---

## What Already Exists (Do Not Duplicate)

| Component | Location | Status |
|---|---|---|
| `Media` model | `packages/database/prisma/schema.prisma:1885` | ✅ Frozen (coexists for backward compatibility) |
| `MediaType` enum | `schema.prisma:380` | ✅ Exists |
| `StorageService` | `apps/api/src/shared/storage/storage.service.ts` | ✅ Exists (stub, upgraded with real adapters) |
| `IStorageService` interface | `src/shared/storage/interfaces/storage-service.interface.ts` | ✅ Exists (stable contract preserved) |
| `SharedStorageModule` | `src/shared/storage/storage.module.ts` | ✅ Registered in `SharedModule` |
| `FileValidationUtil` | `src/common/utils/file-validation.util.ts` | ✅ Exists |
| `ImageValidationUtil` | `src/common/utils/image-validation.util.ts` | ✅ Exists |
| `cloudinary` package | `apps/api/package.json` | ✅ Installed |
| `MEDIA` error codes | `src/common/error-codes/error-codes.constant.ts` | ✅ Exists (extended in Phase 20) |

---

## What Needs to Be Built

### Phase 20.1 — Database Schema Extensions
- **`FileAsset` model**: Physical file metadata, storage identifiers, dimensions, checksum, category, visibility, status, tenant isolation (`salonId`), uploader (`uploadedById`), audit fields.
- **`FileReference` model**: Polymorphic association table linking `FileAsset` to any domain entity (`Salon`, `Branch`, `Staff`, `Service`, `Product`, `Booking`, `Invoice`, `CustomerProfile`).
- **Enums**:
  - `FileAssetStatus`: `PENDING`, `ACTIVE`, `DELETED`, `ARCHIVED`
  - `FileVisibility`: `PUBLIC`, `PRIVATE`, `TENANT`
  - `FileCategory`: `AVATAR`, `SALON_LOGO`, `SALON_GALLERY`, `BRANCH_COVER`, `SERVICE_IMAGE`, `STAFF_PHOTO`, `PRODUCT_IMAGE`, `DOCUMENT`, `BOOKING_ATTACHMENT`, `INVOICE`, `RECEIPT`, `CUSTOMER_DOCUMENT`, `OTHER`

### Phase 20.2 — Storage Provider Adapters
- `IStorageProviderAdapter` — Internal adapter interface.
- `CloudinaryStorageAdapter` — Native Cloudinary integration for media assets.
- `R2StorageAdapter` — S3-compatible Cloudflare R2 / AWS S3 adapter.
- `LocalStorageAdapter` — Local filesystem storage for development & testing.
- `StorageService` modernized into a runtime adapter router delegating to the configured provider (`STORAGE_PROVIDER`).

### Phase 20.3 — Repository Layer
- `FileAssetRepository` (`IFileAssetRepository`) — CRUD, tenant-scoped search, pagination, soft-delete, restore, category filtering, idempotency check.
- `FileReferenceRepository` (`IFileReferenceRepository`) — Entity attachment, asset detachment, entity-based lookup.

### Phase 20.4 — Domain Entities & Business Services
- `FileAssetEntity` & `FileReferenceEntity` — Domain business logic and status evaluation.
- `FileUploadService` — Buffer/stream upload pipeline, validation, checksumming, deduplication, storage dispatch.
- `FileManagementService` — Asset browsing, soft-deletion, restoration, purge, reference management.
- `PresignedUploadService` — Direct client upload URL generation, PENDING state management, confirmation handshake.

### Phase 20.5 — Domain Events & Error Codes
- Events: `FileUploadedEvent`, `FileDeletedEvent`, `FileRestoredEvent`, `FileAssignedEvent`.
- Error Codes: `MEDIA.FILE_NOT_FOUND`, `MEDIA.FILE_ACCESS_DENIED`, `MEDIA.PRESIGNED_EXPIRED`, `MEDIA.FILE_PENDING_CONFIRMATION`.

### Phase 20.6 — Data Transfer Objects (DTOs)
- Direct upload DTOs, listing query DTOs, response DTOs, presigned upload request/response/confirm DTOs, reference assignment DTOs.

### Phase 20.7 — REST Controllers & API Layer
- `FileAdminController` — Platform admin asset governance and storage metrics.
- `FileSalonController` — Salon owner/manager media uploads, document management, presigned uploads, entity linking.
- `FileCustomerController` — Customer avatar and document uploads.
- `FileUrlController` — Authenticated signed URL endpoint for private assets.

### Phase 20.8 — Module Wiring & Integration
- `FilesModule` created and registered in `AppModule`.
- Config schema updated with storage provider environment variables.

### Phase 20.9 — E2E Testing & Verification
- Unit & integration test suites covering all file workflows, tenant isolation, signed URLs, and regression tests across existing domains.
