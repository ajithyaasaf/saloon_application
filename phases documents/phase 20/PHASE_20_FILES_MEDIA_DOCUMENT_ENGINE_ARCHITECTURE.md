# PHASE 20 — FILES, MEDIA & DOCUMENT MANAGEMENT ENGINE ARCHITECTURE BLUEPRINT

**Status**: SPECIFICATION & IMPLEMENTATION ROADMAP  
**Module**: Phase 20 — Files, Media & Document Management Engine  
**Scope**: Multi-Tenant Salon ERP — File Storage Abstraction (Cloudinary, Cloudflare R2 / AWS S3, Local), Media Assets (`FileAsset`), Polymorphic Cross-Domain References (`FileReference`), Access Control & Visibility, Direct/Presigned Client Uploads, Image Optimization & Processing, Auditability, Tenant Isolation, and Lifecycle Management  
**Target Platform**: `@saloon/api` (NestJS / Prisma / PostgreSQL / Redis / BullMQ / Cloudinary / Cloudflare R2 S3-SDK)

---

## 1. Purpose & Vision

The **Files, Media & Document Management Engine** provides a secure, multi-tenant, high-throughput, and provider-agnostic asset management infrastructure for the entire salon SaaS ecosystem.

It powers:
- **Salon Branding & Marketing**: Salon logos, branch cover photos, interior/exterior gallery photos.
- **Service Catalog Media**: High-resolution service menu images, before/after transformation showcase pictures.
- **Staff & Customer Profiles**: Stylist portfolio photos, employee avatar images, customer profile pictures.
- **Product & Inventory Media**: Retail product catalog images, barcode scans, supplier catalogs.
- **Business & Legal Documents**: Salon GST/tax certificates, business licenses, lease agreements, staff identity verification/employment contracts.
- **Financial & Operational Records**: PDF booking summaries, digital receipts, billing invoices, refund vouchers, consent forms.

---

## 2. Scope & Core Capabilities

1. **Storage Provider Abstraction Layer**:
   - Provider-agnostic adapter interface (`IStorageProviderAdapter`) insulated behind `IStorageService`.
   - **Cloudinary Storage Adapter**: Optimized for dynamic image resizing, cropping, compression, and delivery.
   - **Cloudflare R2 / AWS S3 Adapter**: S3-compatible object storage for high-volume, low-cost assets, private documents, and large binary storage with zero egress fees.
   - **Local Storage Adapter**: Filesystem-backed storage for offline development, local Docker environments, and deterministic unit/integration testing.
   - Dynamic adapter resolution via runtime configuration (`STORAGE_PROVIDER`).

2. **Asset Identity & Polymorphic References**:
   - **`FileAsset` (Core Entity)**: Single source of truth for physical file identity, storage location, MIME type, size, dimensions, checksum (SHA-256), categorization, access visibility, and upload status.
   - **`FileReference` (Polymorphic Association)**: Weakly coupled, cross-domain attachment junction table linking a `FileAsset` to any domain entity (`Salon`, `Branch`, `Staff`, `Service`, `Product`, `Booking`, `Invoice`, `CustomerProfile`) with assigned roles (`LOGO`, `COVER`, `GALLERY`, `ATTACHMENT`, `AVATAR`, `DOCUMENT`) and display sorting order.

3. **Multi-Tenant Isolation & Access Control**:
   - Strict `salonId` tenant partition on `FileAsset` and `FileReference`.
   - Global/Platform assets (`salonId: null`) managed strictly by `ADMIN`.
   - **Visibility Controls**:
     - `PUBLIC`: Accessible via CDN/Public URLs directly without token verification (e.g. salon banners, service pictures).
     - `TENANT`: Accessible only by authenticated staff/owner belonging to the specific salon tenant.
     - `PRIVATE`: Highly sensitive documents (tax IDs, contracts, customer medical/skin notes) requiring short-lived, signed access URLs with cryptographic HMAC expiry tokens.

4. **Direct & Presigned Upload Pipelines**:
   - **Multipart Direct Upload**: Streaming buffer/stream upload for standard client uploads through NestJS API gateways.
   - **Presigned Upload Flow**: Two-phase client-direct upload to cloud storage (R2/S3) eliminating API server memory and bandwidth bottlenecks for large files/videos:
     1. Client requests presigned upload URL with expected MIME type and category (`PENDING` state).
     2. Client uploads directly to cloud storage endpoint.
     3. Client confirms upload with file signature/checksum (`ACTIVE` state).
     4. Automated cleanup / garbage collection for abandoned `PENDING` assets.

5. **Image Processing & Validation**:
   - MIME type allowlist validation (JPEG, PNG, WebP, AVIF, PDF, etc.) preventing malicious payloads.
   - Magic bytes / signature verification for strict security.
   - Dimension, aspect ratio, and category-specific file size boundary enforcement (`FileValidationUtil`, `ImageValidationUtil`).

6. **Lifecycle, Idempotency & Audit Trail**:
   - Soft-delete support (`deletedAt`) with immediate quarantine and administrative restoration window.
   - Idempotency key tracking on uploads preventing duplicate file uploads on network retries.
   - Complete audit logging (`AuditService`) on file creation, deletion, visibility changes, and permission alterations.
   - Domain Event emission (`file.uploaded.v1`, `file.deleted.v1`, `file.restored.v1`, `file.assigned.v1`).

---

## 3. Architecture & Domain Boundaries

```
┌────────────────────────────────────────────────────────────────────────┐
│                          API / CONTROLLER LAYER                        │
│   FileAdminController │ FileSalonController │ FileCustomerController  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                          APPLICATION SERVICES                          │
│  FileUploadService │ FileManagementService │ PresignedUploadService    │
└──────────────────┬───────────────────────────────┬─────────────────────┘
                   │                               │
┌──────────────────▼─────────────┐   ┌─────────────▼─────────────────────┐
│       REPOSITORY LAYER         │   │       INFRASTRUCTURE LAYER        │
│   FileAssetRepository          │   │         StorageService            │
│   FileReferenceRepository      │   │  (Cloudinary / R2 / Local Adapters│
└──────────────────┬─────────────┘   └─────────────┬─────────────────────┘
                   │                               │
┌──────────────────▼─────────────┐   ┌─────────────▼─────────────────────┐
│       DATABASE (PRISMA)        │   │    EXTERNAL CLOUD STORAGE (S3/R2) │
│   file_assets │ file_references│   │    Cloudinary / Cloudflare R2     │
└────────────────────────────────┘   └───────────────────────────────────┘
```

### Integration Points:
- **Phase 10 (Salon & Branch Governance)**: Salon logo, branch cover images, salon gallery portfolios.
- **Phase 11 (Service Catalog)**: Category icon images, service menu cover images, before/after media.
- **Phase 12 (Staff Management)**: Staff profile avatars, professional license documents.
- **Phase 13 (Booking Engine)**: Customer reference photos attached to appointment notes.
- **Phase 14 (Payments & Invoicing)**: Generated PDF invoices, payment receipts, refund proofs.
- **Phase 15 (Customer CRM)**: Customer avatars, signed consent PDFs, medical/skin condition uploads.
- **Phase 16 (Inventory Management)**: Product packaging images, vendor invoices, delivery slip scans.
- **Phase 17 (Reviews & Feedback)**: Verified customer service review photo attachments.
- **Phase 18 (Promotions & Marketing)**: Marketing campaign hero banners, digital gift card voucher templates.
- **Phase 19 (Notifications)**: Multimedia email attachments, MMS images, rich push icons.

---

## 4. Database Schema Specification

### 4.1 Enums

```prisma
enum FileAssetStatus {
  PENDING
  ACTIVE
  DELETED
  ARCHIVED

  @@map("enum_file_asset_status")
}

enum FileVisibility {
  PUBLIC
  PRIVATE
  TENANT

  @@map("enum_file_visibility")
}

enum FileCategory {
  AVATAR
  SALON_LOGO
  SALON_GALLERY
  BRANCH_COVER
  SERVICE_IMAGE
  STAFF_PHOTO
  PRODUCT_IMAGE
  DOCUMENT
  BOOKING_ATTACHMENT
  INVOICE
  RECEIPT
  CUSTOMER_DOCUMENT
  OTHER

  @@map("enum_file_category")
}
```

### 4.2 Models

```prisma
model FileAsset {
  id               String          @id @default(uuid()) @db.Uuid
  salonId          String?         @map("salon_id") @db.Uuid
  uploadedById     String          @map("uploaded_by_id") @db.Uuid

  // Storage Identity
  storageProvider  String          @default("CLOUDINARY") @map("storage_provider") @db.VarChar(50)
  storageFileId    String          @map("storage_file_id")
  bucket           String?         @map("bucket") @db.VarChar(100)
  folder           String          @map("folder") @db.VarChar(255)

  // File Metadata
  originalFilename String          @map("original_filename") @db.VarChar(255)
  mimeType         String          @map("mime_type") @db.VarChar(100)
  sizeBytes        Int             @map("size_bytes")
  extension        String          @db.VarChar(20)
  checksum         String?         @map("checksum") @db.VarChar(128)

  // Media Specifics
  category         FileCategory    @default(OTHER)
  width            Int?            @map("width")
  height           Int?            @map("height")
  duration         Int?            @map("duration")

  // Access & Lifecycle
  visibility       FileVisibility  @default(PUBLIC)
  status           FileAssetStatus @default(ACTIVE)

  // URLs
  publicUrl        String?         @map("public_url")
  thumbnailUrl     String?         @map("thumbnail_url")

  // Idempotency
  idempotencyKey   String?         @map("idempotency_key") @db.Uuid

  // Standard Audit & Concurrency
  createdAt        DateTime        @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime        @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt        DateTime?       @map("deleted_at") @db.Timestamptz
  version          Int             @default(1)

  // Relations
  salon            Salon?          @relation("SalonFileAssets", fields: [salonId], references: [id], onDelete: Cascade, map: "fk_file_assets_salon")
  uploader         User            @relation("UserFileAssets", fields: [uploadedById], references: [id], onDelete: Restrict, map: "fk_file_assets_uploader")
  references       FileReference[] @relation("FileAssetReferences")

  @@index([salonId, category, deletedAt], map: "idx_file_assets_salon_category")
  @@index([uploadedById, deletedAt], map: "idx_file_assets_uploader")
  @@index([idempotencyKey], map: "idx_file_assets_idempotency")
  @@index([status, createdAt], map: "idx_file_assets_status_created")
  @@map("file_assets")
}

model FileReference {
  id           String    @id @default(uuid()) @db.Uuid
  fileAssetId  String    @map("file_asset_id") @db.Uuid
  entityType   String    @map("entity_type") @db.VarChar(100)
  entityId     String    @map("entity_id") @db.Uuid
  role         String?   @map("role") @db.VarChar(100)
  sortOrder    Int       @default(0) @map("sort_order")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz

  fileAsset    FileAsset @relation("FileAssetReferences", fields: [fileAssetId], references: [id], onDelete: Cascade, map: "fk_file_refs_file_asset")

  @@unique([fileAssetId, entityType, entityId, role], map: "uq_file_refs_asset_entity_role")
  @@index([entityType, entityId], map: "idx_file_refs_entity")
  @@map("file_references")
}
```

---

## 5. Sub-Phase Implementation Breakdown

### Phase 20.1 — Database Schema Extension
- Update `packages/database/prisma/schema.prisma` with `FileAssetStatus`, `FileVisibility`, `FileCategory` enums and `FileAsset`, `FileReference` models.
- Add reverse relations to `Salon` (`fileAssets`) and `User` (`uploadedFileAssets`).
- Run `pnpm --filter @saloon/database prisma:generate`.

### Phase 20.2 — Storage Provider Adapters & Shared Storage Modernization
- Define `IStorageProviderAdapter` interface.
- Implement `CloudinaryStorageAdapter` using native `cloudinary` SDK.
- Implement `R2StorageAdapter` using S3 SDK (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
- Implement `LocalStorageAdapter` for disk storage in dev/test.
- Refactor `StorageService` in `src/shared/storage/` to act as an adapter router with zero breaking changes to consumers.

### Phase 20.3 — Repository Layer
- `IFileAssetRepository` & `FileAssetRepository`: Tenant-scoped queries, pagination, soft-delete filtering, category filters, idempotency resolution.
- `IFileReferenceRepository` & `FileReferenceRepository`: Polymorphic attachment operations, entity-asset link management, cascading detachment.

### Phase 20.4 — Domain Entities & Business Services
- `FileAssetEntity`: Business invariants, mime categorization, signed URL requirements, deletion status checking.
- `FileReferenceEntity`: Polymorphic relationship entity.
- `FileUploadService`: File stream/buffer ingestion, MIME and byte size validation, SHA-256 checksum computation, idempotent deduplication, storage dispatch.
- `FileManagementService`: Soft-deletion, recovery, hard purge (ADMIN), reference attachment/detachment, tenant asset browsing.
- `PresignedUploadService`: Direct S3/R2 presigned upload URL minting, PENDING registration, client confirmation handshake, expiry handling.

### Phase 20.5 — Domain Events & Error Codes
- Domain Events: `FileUploadedEvent`, `FileDeletedEvent`, `FileRestoredEvent`, `FileAssignedEvent`.
- Machine-Readable Error Codes (`ERROR_CODES.MEDIA`):
  - `FILE_NOT_FOUND` (MEDIA_304) — HTTP 404
  - `FILE_ACCESS_DENIED` (MEDIA_305) — HTTP 403 (IDOR prevention)
  - `PRESIGNED_EXPIRED` (MEDIA_306) — HTTP 410
  - `FILE_PENDING_CONFIRMATION` (MEDIA_307) — HTTP 409

### Phase 20.6 — Data Transfer Objects (DTOs)
- `UploadFileDto`, `ListFileAssetsQueryDto`, `FileAssetResponseDto`.
- `PresignedUploadRequestDto`, `PresignedUploadResponseDto`, `ConfirmPresignedUploadDto`.
- `AssignFileReferenceDto`, `RemoveFileReferenceDto`.

### Phase 20.7 — REST Controllers & API Layer
- `FileAdminController` (`ADMIN`): Platform-wide asset monitoring, storage analytics, emergency hard-delete.
- `FileSalonController` (`OWNER`, `MANAGER`): Direct uploads, salon gallery/logo/document management, presigned URL flow, entity association.
- `FileCustomerController` (`CUSTOMER`): Self-avatar upload, own document attachment.
- `FileUrlController` (Authenticated): On-demand signed URL generation with tenant permission validation.

### Phase 20.8 — Module Wiring & Configuration
- Create `FilesModule` importing `DatabaseModule`, `AuditModule`, `SharedCacheModule`, `EventsModule`, `TransactionModule`, and `SharedStorageModule`.
- Mount `FilesModule` into `AppModule`.

### Phase 20.9 — E2E Testing, Quality Assurance & Verification
- Unit test coverage for all adapters, services, repositories, and controllers.
- E2E integration test suite covering:
  1. Direct multipart file upload and `FileAsset` persistence.
  2. Idempotency deduplication.
  3. Multi-tenant isolation & IDOR prevention.
  4. Soft-delete and restore cycle.
  5. Presigned URL minting and confirmation handshake.
  6. Polymorphic entity reference attachment and detachment.
  7. Signed URL authorization for `PRIVATE` assets.
  8. Full monorepo TypeScript typecheck and production build validation.
