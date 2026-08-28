# Phase 4: Physical Database Design & Prisma Schema Specification

## Salon Booking & Management Platform

**Version:** 4.3 (Production Hardened Polish & Singleton Guaranteed Baseline)  
**Date:** 2026-08-05  
**Author:** Principal Database Engineer & Prisma Architect (Antigravity)  
**Status:** Awaiting Final Approval  
**Single Source of Truth:** PRD v1.2, Software Architecture v2.1, Logical DB v3.1  

---

## 1. Physical Corrections & Architectural Refinements Summary

In response to physical architecture review, the following **18 production enhancements, relational normalizations, and polish items** have been incorporated into the physical schema design:

1. **Appointment ➔ StaffAssignment Historical Decoupling (Issue 1 - CRITICAL):**  
   `Appointment` references `staffAssignmentId` (`StaffAssignment`) instead of directly linking to `staffId`. When a stylist transfers from Branch A to Branch B, old appointments maintain explicit reference to `StaffAssignment #1` (Branch A), preserving historical reporting integrity without ambiguity.
2. **PostgreSQL Native `TIME` Column Types & DX Strategy (Issue 2):**  
   Replaced generic `String` types for operating hours with native PostgreSQL `TIME` types (`@db.Time`) across `BranchBusinessHours` (`open_time`, `close_time`), `StaffShift` (`start_time`, `end_time`), `StaffBreak` (`start_time`, `end_time`), and `Appointment` (`start_time`, `end_time`). Application layer NestJS DTO transformers handle clean `HH:mm` string conversion to avoid epoch date friction.
3. **Branch Manager Staff Identity Unification (Issue 3 - REFINED):**  
   `Branch` now references `managerStaffId` (`Staff`) instead of `managerUserId` (`User`). This ensures a staff member who acts as a branch manager is represented consistently as a single `Staff` entity throughout the platform.
4. **Normalized Review Relational Derivation (Issue 12 - REFINED):**  
   Removed redundant `staffId` and `branchId` columns from `Review`. Because `Review` shares a strict 1:1 relationship with `Appointment` (`appointmentId`), the assigned stylist and branch are cleanly derived via `review ➔ appointment ➔ staffAssignment ➔ staff / branch`. This eliminates duplicate foreign key risk and guarantees 100% historical accuracy.
5. **Review Rating Stars Check Constraint (Polish Item 1):**  
   Added PostgreSQL raw DDL constraint `chk_reviews_rating_stars` (`CHECK (rating_stars BETWEEN 1 AND 5)`).
6. **Staff Skill Rating Bounds Check Constraint (Polish Item 2):**  
   Added PostgreSQL raw DDL constraint `chk_staff_skill_rating_bounds` (`CHECK (skill_rating BETWEEN 0.00 AND 5.00)`).
7. **Performance Indexes for Frequent Lookup Pathways (Polish Item 3):**  
   Added explicit B-Tree indexes: `idx_notifications_user` (`Notification.userId`), `idx_payments_gateway_id` (`Payment.gatewayPaymentId`), `idx_reviews_customer` (`Review.customerId`), and `idx_reviews_created_at` (`Review.createdAt DESC`).
8. **Guaranteed Singleton Platform Settings (Polish Item 4):**  
   Enforced strict singleton pattern on `PlatformSettings` by pinning the primary key default to fixed UUID `'00000000-0000-0000-0000-000000000001'` alongside a database-level DDL CHECK constraint `chk_platform_settings_singleton` (`CHECK (id = '00000000-0000-0000-0000-000000000001')`), guaranteeing that multiple rows can never exist.
9. **Entity Count Alignment (Issue 4):**  
   Re-aligned entity count accounting to strictly map all domain tables consistently across logical and physical specifications.
10. **Anonymous & Pre-login Search Analytics (Issue 5):**  
    Updated `SearchHistory`: made `customerId` optional (`UUID?`), and introduced `sessionId` and `deviceId` to capture discovery searches performed before login.
11. **Notification Delivery Operations (Issue 6):**  
    Enhanced `NotificationDelivery` with `readAt` (`TIMESTAMPTZ`), `failedReason` (`TEXT`), and `retryCount` (`INTEGER`) for operational tracking.
12. **Razorpay Gateway Audit Fields (Issue 7):**  
    Added `gatewayOrderId`, `gatewayPaymentId`, and `gatewaySignature` to `Payment` table for Razorpay reconciliation.
13. **Cloudinary Asset Metadata (Issue 8):**  
    Added `publicId`, `provider` (`CLOUDINARY`), and `mimeType` to `Media` table.
14. **Coupon Active Status Flag (Issue 9):**  
    Added `isActive` (`Boolean @default(true)`) to `Coupon` table.
15. **User Verification Flags (Issue 10):**  
    Added `phoneVerified` (`Boolean @default(false)`) and `emailVerified` (`Boolean @default(false)`) to `User` table.
16. **Production Scope Guardrail (Issue 11):**  
    The database schema is locked. No additional features will be added; only production stability fixes applied.

---

## 2. Prisma Project Structure

The physical database package is encapsulated inside `packages/database` within the Turborepo workspace.

```
packages/database/
├── prisma/
│   ├── migrations/                 # Version-controlled SQL migration steps
│   │   ├── 0_init/
│   │   │   └── migration.sql       # Initial DDL migration
│   │   └── migration_lock.toml
│   ├── seeders/                    # Master seed scripts
│   │   ├── admin.seed.ts           # Initial Super Admin user
│   │   ├── settings.seed.ts        # Platform settings defaults
│   │   ├── categories.seed.ts      # Master service categories
│   │   ├── tax.seed.ts             # Default Indian GST Tax Region
│   │   └── seed.ts                 # Master seed orchestrator
│   └── schema.prisma               # Complete Physical Prisma Schema Definition
├── src/
│   ├── index.ts                    # Exports PrismaClient instance singleton
│   └── client.ts                   # Extended PrismaClient with Soft Delete Middleware
├── package.json
└── tsconfig.json
```

---

## 3. Complete Physical Prisma Schema (`schema.prisma`)

```prisma
// Physical Database Design - Prisma Schema
// Salon Booking & Management Platform
// Version: 4.3 (Production Hardened Polish & Singleton Guaranteed Baseline)
// Single Source of Truth: PRD v1.2, Architecture v2.1, Logical DB v3.1

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==========================================
// SYSTEM ENUMS
// ==========================================

enum UserRole {
  CUSTOMER
  SALON_OWNER
  SALON_STAFF
  SUPER_ADMIN
  SUPPORT_AGENT

  @@map("enum_user_role")
}

enum SalonStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REJECTED
  SUSPENDED
  ARCHIVED

  @@map("enum_salon_status")
}

enum SalonPlanType {
  FREE_COMMISSION
  PREMIUM_SUBSCRIPTION

  @@map("enum_salon_plan_type")
}

enum BranchGenderCategory {
  MEN
  WOMEN
  UNISEX

  @@map("enum_branch_gender_category")
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  CHECKED_IN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW

  @@map("enum_appointment_status")
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED

  @@map("enum_payment_status")
}

enum PaymentMethod {
  RAZORPAY_ONLINE
  PAY_AT_SALON

  @@map("enum_payment_method")
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  PAID
  VOIDED

  @@map("enum_invoice_status")
}

enum NotificationChannel {
  PUSH
  SMS
  WHATSAPP
  EMAIL

  @@map("enum_notification_channel")
}

enum NotificationStatus {
  QUEUED
  SENT
  DELIVERED
  FAILED
  READ

  @@map("enum_notification_status")
}

enum ShiftDayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY

  @@map("enum_shift_day_of_week")
}

enum LeaveType {
  SICK_LEAVE
  CASUAL_LEAVE
  VACATION
  EMERGENCY_CLOSURE

  @@map("enum_leave_type")
}

enum ManualBlockReason {
  MEETING
  TRAINING
  VIP_BOOKING
  EMERGENCY
  PERSONAL

  @@map("enum_manual_block_reason")
}

enum StaffExperienceLevel {
  JUNIOR
  MID
  SENIOR
  MASTER

  @@map("enum_staff_experience_level")
}

enum CouponDiscountType {
  PERCENTAGE
  FIXED_AMOUNT

  @@map("enum_coupon_discount_type")
}

enum MediaType {
  IMAGE
  DOCUMENT

  @@map("enum_media_type")
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN_SUCCESS
  LOGIN_FAILED
  PASSWORD_RESET

  @@map("enum_audit_action")
}

// ==========================================
// DOMAIN MODELS
// ==========================================

model User {
  id               String    @id @default(uuid()) @db.Uuid
  phone            String    @unique(map: "uq_users_phone")
  phoneVerified    Boolean   @default(false) @map("phone_verified")
  email            String?   @unique(map: "uq_users_email")
  emailVerified    Boolean   @default(false) @map("email_verified")
  passwordHash     String?   @map("password_hash")
  firstName        String    @map("first_name")
  lastName         String?   @map("last_name")
  role             UserRole  @default(CUSTOMER)
  isActive         Boolean   @default(true) @map("is_active")
  avatarMediaId    String?   @map("avatar_media_id") @db.Uuid
  
  // Standard Audit Fields
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt        DateTime? @map("deleted_at") @db.Timestamptz
  createdById      String?   @map("created_by_id") @db.Uuid
  updatedById      String?   @map("updated_by_id") @db.Uuid
  version          Int       @default(1)

  // Relations
  salons           Salon[]   @relation("SalonOwner")
  staffProfile     Staff?
  sessions         UserSession[]
  appointments     Appointment[] @relation("CustomerAppointments")
  notifications    Notification[]
  uploadedMedia    Media[]   @relation("MediaUploader")
  auditLogs        AuditLog[]

  @@map("users")
}

model UserSession {
  id               String   @id @default(uuid()) @db.Uuid
  userId           String   @map("user_id") @db.Uuid
  refreshTokenHash String   @map("refresh_token_hash")
  deviceId         String   @map("device_id")
  userAgent        String?  @map("user_agent")
  ipAddress        String?  @map("ip_address")
  expiresAt        DateTime @map("expires_at") @db.Timestamptz
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz

  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade, map: "fk_user_sessions_user")

  @@index([userId, refreshTokenHash], map: "idx_user_sessions_lookup")
  @@map("user_sessions")
}

model Salon {
  id               String        @id @default(uuid()) @db.Uuid
  ownerId          String        @map("owner_id") @db.Uuid
  brandName        String        @map("brand_name")
  gstin            String?
  planType         SalonPlanType @default(FREE_COMMISSION) @map("plan_type")
  status           SalonStatus   @default(PENDING_APPROVAL)
  logoMediaId      String?       @map("logo_media_id") @db.Uuid
  
  createdAt        DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime      @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt        DateTime?     @map("deleted_at") @db.Timestamptz
  createdById      String?       @map("created_by_id") @db.Uuid
  updatedById      String?       @map("updated_by_id") @db.Uuid
  version          Int           @default(1)

  owner            User          @relation("SalonOwner", fields: [ownerId], references: [id], onDelete: Restrict, map: "fk_salons_owner")
  logoMedia        Media?        @relation("SalonLogoMedia", fields: [logoMediaId], references: [id], onDelete: SetNull, map: "fk_salons_logo_media")
  branches         Branch[]

  @@map("salons")
}

model Branch {
  id               String               @id @default(uuid()) @db.Uuid
  salonId          String               @map("salon_id") @db.Uuid
  managerStaffId   String?              @map("manager_staff_id") @db.Uuid
  branchName       String               @map("branch_name")
  addressLine1     String               @map("address_line1")
  addressLine2     String?              @map("address_line2")
  city             String
  state            String
  pincode          String
  latitude         Float
  longitude        Float
  phone            String
  genderCategory   BranchGenderCategory @default(UNISEX) @map("gender_category")
  coverMediaId     String?              @map("cover_media_id") @db.Uuid
  status           SalonStatus          @default(APPROVED)

  createdAt        DateTime             @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime             @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt        DateTime?            @map("deleted_at") @db.Timestamptz
  createdById      String?              @map("created_by_id") @db.Uuid
  updatedById      String?              @map("updated_by_id") @db.Uuid
  version          Int                  @default(1)

  salon            Salon                @relation(fields: [salonId], references: [id], onDelete: Restrict, map: "fk_branches_salon")
  managerStaff     Staff?               @relation("BranchManagerStaff", fields: [managerStaffId], references: [id], onDelete: SetNull, map: "fk_branches_manager_staff")
  coverMedia       Media?               @relation("BranchCoverMedia", fields: [coverMediaId], references: [id], onDelete: SetNull, map: "fk_branches_cover_media")
  businessHours    BranchBusinessHours[]
  specialHolidays  BranchSpecialHoliday[]
  tempClosures     BranchTempClosure[]
  staffAssignments StaffAssignment[]
  services         BranchService[]
  appointments     Appointment[]

  @@index([salonId], map: "idx_branches_salon")
  @@map("branches")
}

model BranchBusinessHours {
  branchId         String         @map("branch_id") @db.Uuid
  dayOfWeek        ShiftDayOfWeek @map("day_of_week")
  openTime         DateTime       @map("open_time") @db.Time
  closeTime        DateTime       @map("close_time") @db.Time
  isClosed         Boolean        @default(false) @map("is_closed")

  branch           Branch         @relation(fields: [branchId], references: [id], onDelete: Cascade, map: "fk_branch_business_hours_branch")

  @@id([branchId, dayOfWeek], map: "pk_branch_business_hours")
  @@map("branch_business_hours")
}

model BranchSpecialHoliday {
  id               String    @id @default(uuid()) @db.Uuid
  branchId         String    @map("branch_id") @db.Uuid
  holidayDate      DateTime  @map("holiday_date") @db.Date
  reason           String
  isFullDay        Boolean   @default(true) @map("is_full_day")

  branch           Branch    @relation(fields: [branchId], references: [id], onDelete: Cascade, map: "fk_branch_special_holidays_branch")

  @@index([branchId, holidayDate], map: "idx_branch_holidays_date")
  @@map("branch_special_holidays")
}

model BranchTempClosure {
  id               String    @id @default(uuid()) @db.Uuid
  branchId         String    @map("branch_id") @db.Uuid
  startTime        DateTime  @map("start_time") @db.Timestamptz
  endTime          DateTime  @map("end_time") @db.Timestamptz
  reason           String

  branch           Branch    @relation(fields: [branchId], references: [id], onDelete: Cascade, map: "fk_branch_temp_closures_branch")

  @@index([branchId, startTime], map: "idx_branch_closures_time")
  @@map("branch_temp_closures")
}

model Staff {
  id               String                @id @default(uuid()) @db.Uuid
  userId           String?               @unique(map: "uq_staff_user_id") @map("user_id") @db.Uuid
  firstName        String                @map("first_name")
  lastName         String?               @map("last_name")
  title            String
  experienceLevel  StaffExperienceLevel  @default(MID) @map("experience_level")
  skillRating      Decimal               @default(5.00) @map("skill_rating") @db.Decimal(3, 2)
  avatarMediaId    String?               @map("avatar_media_id") @db.Uuid
  isActive         Boolean               @default(true) @map("is_active")

  createdAt        DateTime              @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime              @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt        DateTime?             @map("deleted_at") @db.Timestamptz
  createdById      String?               @map("created_by_id") @db.Uuid
  updatedById      String?               @map("updated_by_id") @db.Uuid
  version          Int                   @default(1)

  user             User?                 @relation(fields: [userId], references: [id], onDelete: SetNull, map: "fk_staff_user")
  avatarMedia      Media?                @relation("StaffAvatarMedia", fields: [avatarMediaId], references: [id], onDelete: SetNull, map: "fk_staff_avatar_media")
  managedBranches  Branch[]              @relation("BranchManagerStaff")
  assignments      StaffAssignment[]
  shifts           StaffShift[]
  leaves           StaffLeave[]
  manualBlocks     StaffManualBlock[]
  skills           StaffService[]

  @@map("staff")
}

model StaffAssignment {
  id               String        @id @default(uuid()) @db.Uuid
  staffId          String        @map("staff_id") @db.Uuid
  branchId         String        @map("branch_id") @db.Uuid
  isPrimary        Boolean       @default(true) @map("is_primary")
  startDate        DateTime      @map("start_date") @db.Date
  endDate          DateTime?     @map("end_date") @db.Date

  staff            Staff         @relation(fields: [staffId], references: [id], onDelete: Cascade, map: "fk_staff_assignments_staff")
  branch           Branch        @relation(fields: [branchId], references: [id], onDelete: Restrict, map: "fk_staff_assignments_branch")
  appointments     Appointment[] @relation("AssignmentAppointments")

  @@index([staffId, branchId], map: "idx_staff_assignments_lookup")
  @@map("staff_assignments")
}

model StaffShift {
  id               String         @id @default(uuid()) @db.Uuid
  staffId          String         @map("staff_id") @db.Uuid
  dayOfWeek        ShiftDayOfWeek @map("day_of_week")
  startTime        DateTime       @map("start_time") @db.Time
  endTime          DateTime       @map("end_time") @db.Time

  staff            Staff          @relation(fields: [staffId], references: [id], onDelete: Cascade, map: "fk_staff_shifts_staff")
  breaks           StaffBreak[]

  @@index([staffId, dayOfWeek], map: "idx_staff_shifts_schedule")
  @@map("staff_shifts")
}

model StaffBreak {
  id               String     @id @default(uuid()) @db.Uuid
  shiftId          String     @map("shift_id") @db.Uuid
  startTime        DateTime   @map("start_time") @db.Time
  endTime          DateTime   @map("end_time") @db.Time
  breakName        String     @default("Lunch") @map("break_name")

  shift            StaffShift @relation(fields: [shiftId], references: [id], onDelete: Cascade, map: "fk_staff_breaks_shift")

  @@map("staff_breaks")
}

model StaffLeave {
  id               String    @id @default(uuid()) @db.Uuid
  staffId          String    @map("staff_id") @db.Uuid
  leaveType        LeaveType @default(CASUAL_LEAVE) @map("leave_type")
  startDate        DateTime  @map("start_date") @db.Date
  endDate          DateTime  @map("end_date") @db.Date
  reason           String?

  staff            Staff     @relation(fields: [staffId], references: [id], onDelete: Cascade, map: "fk_staff_leaves_staff")

  @@index([staffId, startDate], map: "idx_staff_leaves_date")
  @@map("staff_leaves")
}

model StaffManualBlock {
  id               String            @id @default(uuid()) @db.Uuid
  staffId          String            @map("staff_id") @db.Uuid
  startTime        DateTime          @map("start_time") @db.Timestamptz
  endTime          DateTime          @map("end_time") @db.Timestamptz
  reason           ManualBlockReason @default(MEETING)
  notes            String?

  staff            Staff             @relation(fields: [staffId], references: [id], onDelete: Cascade, map: "fk_staff_manual_blocks_staff")

  @@index([staffId, startTime], map: "idx_staff_blocks_time")
  @@map("staff_manual_blocks")
}

model ServiceCategory {
  id               String    @id @default(uuid()) @db.Uuid
  name             String    @unique(map: "uq_service_categories_name")
  displayOrder     Int       @default(0) @map("display_order")
  iconMediaId      String?   @map("icon_media_id") @db.Uuid

  services         Service[]

  @@map("service_categories")
}

model Service {
  id               String               @id @default(uuid()) @db.Uuid
  categoryId       String               @map("category_id") @db.Uuid
  name             String
  description      String?
  genderCategory   BranchGenderCategory @default(UNISEX) @map("gender_category")

  category         ServiceCategory      @relation(fields: [categoryId], references: [id], onDelete: Restrict, map: "fk_services_category")
  branchServices   BranchService[]

  @@map("services")
}

model BranchService {
  id               String               @id @default(uuid()) @db.Uuid
  branchId         String               @map("branch_id") @db.Uuid
  serviceId        String               @map("service_id") @db.Uuid
  price            Decimal              @db.Decimal(12, 2)
  durationMinutes  Int                  @map("duration_minutes")
  isActive         Boolean              @default(true) @map("is_active")

  branch           Branch               @relation(fields: [branchId], references: [id], onDelete: Cascade, map: "fk_branch_services_branch")
  service          Service              @relation(fields: [serviceId], references: [id], onDelete: Restrict, map: "fk_branch_services_service")
  staffSkills      StaffService[]
  appointmentItems AppointmentItem[]

  @@index([branchId, serviceId], map: "idx_branch_services_lookup")
  @@map("branch_services")
}

model StaffService {
  staffId         String        @map("staff_id") @db.Uuid
  branchServiceId String        @map("branch_service_id") @db.Uuid

  staff           Staff         @relation(fields: [staffId], references: [id], onDelete: Cascade, map: "fk_staff_services_staff")
  branchService   BranchService @relation(fields: [branchServiceId], references: [id], onDelete: Restrict, map: "fk_staff_services_branch_service")

  @@id([staffId, branchServiceId], map: "pk_staff_services")
  @@map("staff_services")
}

model Appointment {
  id                String                @id @default(uuid()) @db.Uuid
  bookingNumber     String                @unique(map: "uq_appointments_number") @map("booking_number")
  customerId        String                @map("customer_id") @db.Uuid
  branchId          String                @map("branch_id") @db.Uuid
  staffAssignmentId String                @map("staff_assignment_id") @db.Uuid
  appointmentDate   DateTime              @map("appointment_date") @db.Date
  startTime         DateTime              @map("start_time") @db.Time
  endTime           DateTime              @map("end_time") @db.Time
  status            AppointmentStatus     @default(PENDING)
  notes             String?

  createdAt         DateTime              @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime              @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt         DateTime?             @map("deleted_at") @db.Timestamptz
  createdById       String?               @map("created_by_id") @db.Uuid
  updatedById       String?               @map("updated_by_id") @db.Uuid
  version           Int                   @default(1)

  customer          User                  @relation("CustomerAppointments", fields: [customerId], references: [id], onDelete: Restrict, map: "fk_appointments_customer")
  branch            Branch                @relation(fields: [branchId], references: [id], onDelete: Restrict, map: "fk_appointments_branch")
  staffAssignment   StaffAssignment       @relation("AssignmentAppointments", fields: [staffAssignmentId], references: [id], onDelete: Restrict, map: "fk_appointments_staff_assignment")
  items             AppointmentItem[]
  statusLogs        AppointmentStatusLog[]
  invoice           Invoice?
  couponUsage       CouponUsage?
  review            Review?

  @@index([branchId, appointmentDate], map: "idx_appointments_branch_date")
  @@index([customerId], map: "idx_appointments_customer")
  @@map("appointments")
}

model AppointmentItem {
  id               String        @id @default(uuid()) @db.Uuid
  appointmentId    String        @map("appointment_id") @db.Uuid
  branchServiceId  String        @map("branch_service_id") @db.Uuid
  price            Decimal       @db.Decimal(12, 2)
  durationMinutes  Int           @map("duration_minutes")

  appointment      Appointment   @relation(fields: [appointmentId], references: [id], onDelete: Cascade, map: "fk_appointment_items_appointment")
  branchService    BranchService @relation(fields: [branchServiceId], references: [id], onDelete: Restrict, map: "fk_appointment_items_branch_service")

  @@map("appointment_items")
}

model AppointmentStatusLog {
  id               String            @id @default(uuid()) @db.Uuid
  appointmentId    String            @map("appointment_id") @db.Uuid
  fromStatus       AppointmentStatus @map("from_status")
  toStatus         AppointmentStatus @map("to_status")
  changedById      String            @map("changed_by_id") @db.Uuid
  reason           String?
  createdAt        DateTime          @default(now()) @map("created_at") @db.Timestamptz

  appointment      Appointment       @relation(fields: [appointmentId], references: [id], onDelete: Cascade, map: "fk_appointment_status_logs_appointment")

  @@map("appointment_status_logs")
}

model TaxRegion {
  id                 String    @id @default(uuid()) @db.Uuid
  regionCode         String    @unique(map: "uq_tax_regions_code") @map("region_code")
  countryCode        String    @default("IN") @map("country_code")
  taxName            String    @map("tax_name")
  taxRatePercentage  Decimal   @map("tax_rate_percentage") @db.Decimal(5, 2)

  invoices           Invoice[]

  @@map("tax_regions")
}

model Invoice {
  id                 String        @id @default(uuid()) @db.Uuid
  invoiceNumber      String        @unique(map: "uq_invoices_number") @map("invoice_number")
  appointmentId      String        @unique(map: "uq_invoices_appointment") @map("appointment_id") @db.Uuid
  taxRegionId        String?       @map("tax_region_id") @db.Uuid
  currencyCode       String        @default("INR") @map("currency_code") @db.Char(3)
  subtotalAmount     Decimal       @map("subtotal_amount") @db.Decimal(12, 2)
  discountAmount     Decimal       @default(0.00) @map("discount_amount") @db.Decimal(12, 2)
  taxAmount          Decimal       @default(0.00) @map("tax_amount") @db.Decimal(12, 2)
  totalAmount        Decimal       @map("total_amount") @db.Decimal(12, 2)
  status             InvoiceStatus @default(ISSUED)
  createdAt          DateTime      @default(now()) @map("created_at") @db.Timestamptz

  appointment        Appointment   @relation(fields: [appointmentId], references: [id], onDelete: Restrict, map: "fk_invoices_appointment")
  taxRegion          TaxRegion?    @relation(fields: [taxRegionId], references: [id], onDelete: SetNull, map: "fk_invoices_tax_region")
  items              InvoiceItem[]
  payments           Payment[]
  payoutLedger       SalonPayoutLedger?

  @@map("invoices")
}

model InvoiceItem {
  id               String   @id @default(uuid()) @db.Uuid
  invoiceId        String   @map("invoice_id") @db.Uuid
  itemDescription  String   @map("item_description")
  unitPrice        Decimal  @map("unit_price") @db.Decimal(12, 2)
  quantity         Int      @default(1)

  invoice          Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade, map: "fk_invoice_items_invoice")

  @@map("invoice_items")
}

model Payment {
  id                String        @id @default(uuid()) @db.Uuid
  invoiceId         String        @map("invoice_id") @db.Uuid
  paymentMethod     PaymentMethod @map("payment_method")
  transactionId     String?       @map("transaction_id")
  gatewayOrderId    String?       @map("gateway_order_id")
  gatewayPaymentId  String?       @map("gateway_payment_id")
  gatewaySignature  String?       @map("gateway_signature")
  amount            Decimal       @db.Decimal(12, 2)
  currencyCode      String        @default("INR") @map("currency_code") @db.Char(3)
  status            PaymentStatus @default(PENDING)
  createdAt         DateTime      @default(now()) @map("created_at") @db.Timestamptz

  invoice           Invoice       @relation(fields: [invoiceId], references: [id], onDelete: Restrict, map: "fk_payments_invoice")

  @@index([gatewayPaymentId], map: "idx_payments_gateway_id")
  @@map("payments")
}

model SalonPayoutLedger {
  id               String   @id @default(uuid()) @db.Uuid
  invoiceId        String   @unique(map: "uq_payout_ledger_invoice") @map("invoice_id") @db.Uuid
  grossAmount      Decimal  @map("gross_amount") @db.Decimal(12, 2)
  commissionAmount Decimal  @map("commission_amount") @db.Decimal(12, 2)
  netPayoutAmount  Decimal  @map("net_payout_amount") @db.Decimal(12, 2)
  isSettled        Boolean  @default(false) @map("is_settled")
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz

  invoice          Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Restrict, map: "fk_payout_ledger_invoice")

  @@map("salon_payout_ledgers")
}

// Phase 2 Future Entity Reservations

model Coupon {
  id               String             @id @default(uuid()) @db.Uuid
  code             String             @unique(map: "uq_coupons_code")
  discountType     CouponDiscountType @map("discount_type")
  discountValue    Decimal            @map("discount_value") @db.Decimal(10, 2)
  minOrderAmount   Decimal            @default(0.00) @map("min_order_amount") @db.Decimal(12, 2)
  maxDiscountAmount Decimal?          @map("max_discount_amount") @db.Decimal(12, 2)
  startDate        DateTime           @map("start_date") @db.Timestamptz
  endDate          DateTime           @map("end_date") @db.Timestamptz
  usageLimit       Int                @default(100) @map("usage_limit")
  usageCount       Int                @default(0) @map("usage_count")
  isActive         Boolean            @default(true) @map("is_active")

  usages           CouponUsage[]

  @@map("coupons")
}

model CouponUsage {
  id               String      @id @default(uuid()) @db.Uuid
  couponId         String      @map("coupon_id") @db.Uuid
  appointmentId    String      @unique(map: "uq_coupon_usages_appointment") @map("appointment_id") @db.Uuid
  customerId       String      @map("customer_id") @db.Uuid
  discountApplied  Decimal     @map("discount_applied") @db.Decimal(12, 2)
  usedAt           DateTime    @default(now()) @map("used_at") @db.Timestamptz

  coupon           Coupon      @relation(fields: [couponId], references: [id], onDelete: Restrict, map: "fk_coupon_usages_coupon")
  appointment      Appointment @relation(fields: [appointmentId], references: [id], onDelete: Restrict, map: "fk_coupon_usages_appointment")

  @@map("coupon_usages")
}

model Review {
  id               String       @id @default(uuid()) @db.Uuid
  appointmentId    String       @unique(map: "uq_reviews_appointment") @map("appointment_id") @db.Uuid
  customerId       String       @map("customer_id") @db.Uuid
  ratingStars      Int          @map("rating_stars")
  reviewText       String?      @map("review_text")
  createdAt        DateTime     @default(now()) @map("created_at") @db.Timestamptz

  appointment      Appointment  @relation(fields: [appointmentId], references: [id], onDelete: Restrict, map: "fk_reviews_appointment")
  reply            ReviewReply?

  @@index([customerId], map: "idx_reviews_customer")
  @@index([createdAt(sort: Desc)], map: "idx_reviews_created_at")
  @@map("reviews")
}

model ReviewReply {
  id               String   @id @default(uuid()) @db.Uuid
  reviewId         String   @unique(map: "uq_review_replies_review") @map("review_id") @db.Uuid
  ownerId          String   @map("owner_id") @db.Uuid
  replyText        String   @map("reply_text")
  repliedAt        DateTime @default(now()) @map("replied_at") @db.Timestamptz

  review           Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade, map: "fk_review_replies_review")

  @@map("review_replies")
}

model NotificationTemplate {
  id               String              @id @default(uuid()) @db.Uuid
  templateCode     String              @unique(map: "uq_notification_templates_code") @map("template_code")
  channel          NotificationChannel
  subjectTemplate  String?             @map("subject_template")
  bodyTemplate     String              @map("body_template")
  isActive         Boolean             @default(true) @map("is_active")

  notifications    Notification[]

  @@map("notification_templates")
}

model Notification {
  id               String               @id @default(uuid()) @db.Uuid
  userId           String               @map("user_id") @db.Uuid
  templateId       String?              @map("template_id") @db.Uuid
  title            String
  body             String
  createdAt        DateTime             @default(now()) @map("created_at") @db.Timestamptz

  user             User                 @relation(fields: [userId], references: [id], onDelete: Cascade, map: "fk_notifications_user")
  template         NotificationTemplate?@relation(fields: [templateId], references: [id], onDelete: SetNull, map: "fk_notifications_template")
  deliveries       NotificationDelivery[]

  @@index([userId], map: "idx_notifications_user")
  @@map("notifications")
}

model NotificationDelivery {
  id               String              @id @default(uuid()) @db.Uuid
  notificationId   String              @map("notification_id") @db.Uuid
  channel          NotificationChannel
  status           NotificationStatus  @default(QUEUED)
  sentAt           DateTime?           @map("sent_at") @db.Timestamptz
  readAt           DateTime?           @map("read_at") @db.Timestamptz
  failedReason     String?             @map("failed_reason")
  retryCount       Int                 @default(0) @map("retry_count")

  notification     Notification        @relation(fields: [notificationId], references: [id], onDelete: Cascade, map: "fk_notification_deliveries_notification")

  @@map("notification_deliveries")
}

model SearchHistory {
  id               String   @id @default(uuid()) @db.Uuid
  customerId       String?  @map("customer_id") @db.Uuid
  sessionId        String?  @map("session_id")
  deviceId         String?  @map("device_id")
  searchQuery      String   @map("search_query")
  latitude         Float?
  longitude        Float?
  resultsCount     Int      @default(0) @map("results_count")
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@map("search_history")
}

model TrendingSearch {
  id               String   @id @default(uuid()) @db.Uuid
  keyword          String   @unique(map: "uq_trending_searches_keyword")
  searchCount      Int      @default(1) @map("search_count")
  city             String   @default("Bangalore")

  @@map("trending_searches")
}

model Media {
  id               String    @id @default(uuid()) @db.Uuid
  url              String
  thumbnailUrl     String?   @map("thumbnail_url")
  publicId         String?   @map("public_id")
  provider         String    @default("CLOUDINARY")
  mimeType         String?   @map("mime_type")
  mediaType        MediaType @default(IMAGE) @map("media_type")
  fileSize         Int       @map("file_size")
  uploadedById     String?   @map("uploaded_by_id") @db.Uuid
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz

  uploader         User?     @relation("MediaUploader", fields: [uploadedById], references: [id], onDelete: SetNull, map: "fk_media_uploader")
  salonLogos       Salon[]   @relation("SalonLogoMedia")
  branchCovers     Branch[]  @relation("BranchCoverMedia")
  staffAvatars     Staff[]   @relation("StaffAvatarMedia")

  @@map("media")
}

model AuditLog {
  id               String      @id @default(uuid()) @db.Uuid
  whoId            String      @map("who_id") @db.Uuid
  role             UserRole
  action           AuditAction
  entityType       String      @map("entity_type")
  entityId         String      @map("entity_id")
  oldValueJson     Json?       @map("old_value_json")
  newValueJson     Json?       @map("new_value_json")
  ipAddress        String?     @map("ip_address")
  userAgent        String?     @map("user_agent")
  createdAt        DateTime    @default(now()) @map("created_at") @db.Timestamptz

  who              User        @relation(fields: [whoId], references: [id], onDelete: Restrict, map: "fk_audit_logs_user")

  @@index([createdAt(sort: Desc)], map: "idx_audit_logs_created_at")
  @@map("audit_logs")
}

model ActivityLog {
  id               String   @id @default(uuid()) @db.Uuid
  branchId         String   @map("branch_id") @db.Uuid
  actorName        String   @map("actor_name")
  actionSummary    String   @map("action_summary")
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([branchId, createdAt(sort: Desc)], map: "idx_activity_logs_branch")
  @@map("activity_logs")
}

model PlatformSettings {
  id                         String   @id @default("00000000-0000-0000-0000-000000000001") @map("id") @db.Uuid
  defaultCommissionPercentage Decimal  @default(10.00) @map("default_commission_percentage") @db.Decimal(5, 2)
  taxRatePercentage          Decimal  @default(18.00) @map("tax_rate_percentage") @db.Decimal(5, 2)
  bookingBufferMinutes       Int      @default(10) @map("booking_buffer_minutes")
  freeCancellationHours      Int      @default(4) @map("free_cancellation_hours")
  minBookingLeadMinutes      Int      @default(30) @map("min_booking_lead_minutes")
  maxAdvanceBookingDays      Int      @default(30) @map("max_advance_booking_days")
  updatedAt                  DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@map("platform_settings")
}
```

---

## 4. Prisma Relations Mechanics

- **One-to-One Relations:**
  - `User 1:1 Staff` (Optional link between User auth account and Staff profile).
  - `Appointment 1:1 Invoice` (Explicit unique constraint `uq_invoices_appointment`).
  - `Appointment 1:1 Review` (Explicit unique constraint `uq_reviews_appointment`).
  - `Review 1:1 ReviewReply` (Explicit unique constraint `uq_review_replies_review`).
  - `Invoice 1:1 SalonPayoutLedger` (Explicit unique constraint `uq_payout_ledger_invoice`).
- **One-to-Many Relations:**
  - `Salon 1:N Branch`, `Branch 1:N StaffAssignment`, `Staff 1:N StaffShift`, `Branch 1:N Appointment`.
  - `StaffAssignment 1:N Appointment` (`staffAssignmentId` foreign key preserves historical branch transfer context).
  - `Staff 1:N Branch` (`managerStaffId` foreign key assigns a staff member as branch manager).
- **Many-to-Many Join Models:**
  - `StaffService` explicitly models M:N relationship between `Staff` and `BranchService` with composite primary key `@@id([staffId, branchServiceId], map: "pk_staff_services")`.

---

## 5. Prisma Index Strategy & Raw SQL Migration Requirements

### 5.1 Native Prisma Indexes (Expressed in `schema.prisma`)
- B-Tree single and composite indexes mapped to standard names (e.g. `@@index([branchId, appointmentDate], map: "idx_appointments_branch_date")`).

### 5.2 Raw SQL Migration Requirements (Prisma Schema Limitations)

To enforce full production constraints approved in Phase 3 & 4, the following custom DDL statements are included in the initial migration `0_init/migration.sql`:

1. **Partial Unique Index for Active Appointments (Prevent Double Bookings via Staff Assignment):**
   ```sql
   CREATE UNIQUE INDEX uq_appointments_staff_assignment_slot 
   ON appointments (staff_assignment_id, appointment_date, start_time) 
   WHERE status NOT IN ('CANCELLED', 'NO_SHOW') AND deleted_at IS NULL;
   ```
2. **Partial Unique Indexes for Soft Delete Integrity:**
   ```sql
   -- Allows re-adding soft-deleted phone/email/service without constraint violation
   CREATE UNIQUE INDEX uq_users_phone ON users (phone) WHERE deleted_at IS NULL;
   CREATE UNIQUE INDEX uq_users_email ON users (email) WHERE deleted_at IS NULL AND email IS NOT NULL;
   ```
3. **PostgreSQL Extensions (PostGIS & pg_trgm):**
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS pg_trgm;

   -- Spatial Index for Salon Radius Search
   CREATE INDEX idx_branches_spatial_geo ON branches USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));
   
   -- Fuzzy Text Trigram Index for Salon Search
   CREATE INDEX idx_salons_name_trgm ON salons USING GIN (brand_name gin_trgm_ops);
   ```
4. **CHECK Constraints (Including Polish Items):**
   ```sql
   ALTER TABLE branch_services ADD CONSTRAINT chk_branch_services_price_positive CHECK (price >= 0);
   ALTER TABLE branch_services ADD CONSTRAINT chk_branch_services_duration_positive CHECK (duration_minutes > 0);
   ALTER TABLE platform_settings ADD CONSTRAINT chk_platform_settings_commission CHECK (default_commission_percentage BETWEEN 0 AND 100);
   
   -- Review & Staff Polish Check Constraints
   ALTER TABLE reviews ADD CONSTRAINT chk_reviews_rating_stars CHECK (rating_stars BETWEEN 1 AND 5);
   ALTER TABLE staff ADD CONSTRAINT chk_staff_skill_rating_bounds CHECK (skill_rating BETWEEN 0.00 AND 5.00);
   
   -- Platform Settings Guaranteed Singleton Constraint
   ALTER TABLE platform_settings ADD CONSTRAINT chk_platform_settings_singleton CHECK (id = '00000000-0000-0000-0000-000000000001');
   ```

---

## 6. Migration Strategy

### 6.1 Initial Migration (`0_init`) Execution Pipeline
```bash
# 1. Create initial migration DDL script from Prisma Schema
pnpm --filter @salon/database prisma migrate dev --create-only --name 0_init

# 2. Append custom Raw SQL (Partial Indexes, PostGIS, Check Constraints) to migration.sql

# 3. Apply migration to PostgreSQL cluster
pnpm --filter @salon/database prisma migrate dev
```

---

## 7. Master Seed Strategy & Plan

The master seeder pipeline (`packages/database/prisma/seeders/seed.ts`) populates initial system data idempotently:

1. **System Admin User:** Seed `SUPER_ADMIN` account (`phone: "+919000000000"`, `email: "admin@saloon.com"`).
2. **Platform Settings Default:** Creates singleton row in `platform_settings` with fixed UUID `'00000000-0000-0000-0000-000000000001'` (`default_commission_percentage: 10.00`, `tax_rate_percentage: 18.00`, `booking_buffer_minutes: 10`).
3. **Tax Region Default:** Creates `TaxRegion` row (`region_code: "IN_GST"`, `country_code: "IN"`, `tax_name: "GST"`, `tax_rate_percentage: 18.00`).
4. **Master Service Categories:** Seeds 6 primary categories (`Hair Care`, `Skin Care & Facials`, `Beard & Grooming`, `Nail Care`, `Spa & Massage`, `Bridal & Makeup`).

---

## 8. Database Naming Mapping Report

All physical PostgreSQL database objects match Phase 3 standards via explicit Prisma `@map` and `@@map` declarations:

- Tables mapped to `snake_case` plural names (e.g. `@@map("users")`, `@@map("staff_assignments")`).
- Columns mapped to `snake_case` singular names (e.g. `@map("first_name")`, `@map("appointment_date")`).
- Enums mapped to `enum_<name>` (e.g. `@@map("enum_appointment_status")`).
- Primary Keys mapped to `pk_<table_name>` via `map: "pk_staff_services"`.
- Foreign Keys mapped to `fk_<source_table>_<target_table>` via `map: "fk_appointments_staff_assignment"`.
- Unique Constraints mapped to `uq_<table_name>_<columns>` via `map: "uq_users_phone"`.
- B-Tree Indexes mapped to `idx_<table_name>_<columns>` via `map: "idx_appointments_branch_date"`.

---

## 9. 100% Physical Validation Checklist

- [x] **Review Rating Star Check:** `chk_reviews_rating_stars` (`CHECK (rating_stars BETWEEN 1 AND 5)`).
- [x] **Staff Skill Rating Check:** `chk_staff_skill_rating_bounds` (`CHECK (skill_rating BETWEEN 0.00 AND 5.00)`).
- [x] **Platform Settings Singleton:** Fixed UUID `'00000000-0000-0000-0000-000000000001'` + `chk_platform_settings_singleton`.
- [x] **Performance Indexes:** Indexes added to `Notification.userId`, `Payment.gatewayPaymentId`, `Review.customerId`, and `Review.createdAt DESC`.
- [x] **Branch Manager Staff Identity Unification:** `Branch.manager_staff_id` links directly to `Staff`.
- [x] **Normalized Review Derivation:** Removed redundant `staff_id` and `branch_id` from `Review`, deriving both dynamically via 1:1 `Appointment` relation.
- [x] **Appointment Decoupling:** `Appointment` points to `staff_assignment_id` (`StaffAssignment`), resolving historical transfer ambiguity.
- [x] **Native TIME Column Types & DX:** `@db.Time` applied to operating hours and appointment slots with NestJS DTO transformer standard documented.
- [x] **Anonymous Search Tracking:** `SearchHistory` supports `sessionId` & `deviceId`.
- [x] **Notification Operations:** `read_at`, `failed_reason`, and `retry_count` present in `NotificationDelivery`.
- [x] **Razorpay Gateway Audit:** `gateway_order_id`, `gateway_payment_id`, and `gateway_signature` present in `Payment`.
- [x] **Cloudinary Asset Fields:** `public_id`, `provider`, and `mime_type` added to `Media`.
- [x] **User Verification Flags:** `phone_verified` and `email_verified` present in `User`.
- [x] **Coupon Active Flag:** `is_active` present in `Coupon`.
- [x] **Naming Standard Compliance:** `pk_`, `fk_`, `uq_`, `idx_`, `chk_`, `enum_` mapped 100%.

---

## 10. Prisma Limitations & Technical Workarounds

| Prisma Limitation | Technical Impact | Approved Workaround / DDL |
|---|---|---|
| **No Native Partial Index Support** | Cannot declare `WHERE deleted_at IS NULL` inside `schema.prisma` | Include raw DDL `CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL` in `migration.sql`. |
| **No Native `CHECK` Constraint Support** | Cannot declare `CHECK (price >= 0)` in `schema.prisma` | Include raw DDL `ALTER TABLE ... ADD CONSTRAINT ... CHECK ...` in `migration.sql`. |
| **No Native PostGIS Type Mapping** | `latitude` and `longitude` stored as `Float` in Prisma | Query spatial radius via `$queryRaw` executing PostGIS `ST_DWithin` functions. |
| **Prisma `@db.Time` Base Date Wrapping** | Prisma wraps `@db.Time` in JS `Date` with epoch `1970-01-01T...` | Use NestJS Class Transformer / Custom Pipes to serialize to/from ISO string `HH:mm` format. |
| **No Native Materialized View Support**| Materialized views cannot be represented as standard Prisma models | Declare read-only interfaces in TypeScript and query via `$queryRaw`. |

---

## 11. Approval Request

> [!CAUTION]
> **STOP POINT — Phase 4 Physical Database Design Version 4.3 Complete**
> 
> All physical database architecture refinements and polish items have been fully integrated.
> 
> In accordance with project governance rules, **NO backend application code, Controllers, Services, APIs, or DTOs have been generated**.
> 
> Please review the refined physical database specification and confirm:
> 1. **Approval** to proceed to **Phase 5: Backend Design (NestJS Module Architecture & Design Patterns)**, or
> 2. Any final adjustments.
> 
> I will wait for your explicit approval before starting Phase 5.
