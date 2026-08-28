/**
 * Canonical domain enums mirrored from the backend database/domain models.
 * Frontends and client libraries consume these enums directly without importing Prisma or server libraries.
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SALON_OWNER = 'SALON_OWNER',
  SALON_MANAGER = 'SALON_MANAGER',
  SALON_STAFF = 'SALON_STAFF',
  CUSTOMER = 'CUSTOMER',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum SalonStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum BranchStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TEMPORARILY_CLOSED = 'TEMPORARILY_CLOSED',
}

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export enum ClosureType {
  HOLIDAY = 'HOLIDAY',
  MAINTENANCE = 'MAINTENANCE',
  EMERGENCY = 'EMERGENCY',
  WEATHER = 'WEATHER',
  OTHER = 'OTHER',
}

export enum StaffStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

export enum LeaveType {
  CASUAL = 'CASUAL',
  SICK = 'SICK',
  ANNUAL = 'ANNUAL',
  UNPAID = 'UNPAID',
  EMERGENCY = 'EMERGENCY',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum BookingPaymentType {
  ONLINE = 'ONLINE',
  PAY_AT_SALON = 'PAY_AT_SALON',
  MEMBERSHIP_CREDIT = 'MEMBERSHIP_CREDIT',
  GIFT_CARD = 'GIFT_CARD',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  UPI = 'UPI',
  CARD = 'CARD',
  NETBANKING = 'NETBANKING',
  WALLET = 'WALLET',
  CASH = 'CASH',
  GIFT_CARD = 'GIFT_CARD',
  MEMBERSHIP = 'MEMBERSHIP',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PAID = 'PAID',
  VOID = 'VOID',
  REFUNDED = 'REFUNDED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

export enum CustomerTier {
  REGULAR = 'REGULAR',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  VIP = 'VIP',
}

export enum LoyaltyTransactionType {
  EARN = 'EARN',
  REDEEM = 'REDEEM',
  ADJUSTMENT = 'ADJUSTMENT',
  EXPIRE = 'EXPIRE',
  BONUS = 'BONUS',
}

export enum StockMovementType {
  PURCHASE_IN = 'PURCHASE_IN',
  USAGE_OUT = 'USAGE_OUT',
  SALE_OUT = 'SALE_OUT',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  RETURN_IN = 'RETURN_IN',
  WASTE_OUT = 'WASTE_OUT',
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  ORDERED = 'ORDERED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum StockTransferStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum ReviewRating {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
}

export enum ReviewModerationStatus {
  PUBLISHED = 'PUBLISHED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  FLAGGED = 'FLAGGED',
  REMOVED = 'REMOVED',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SERVICE = 'FREE_SERVICE',
  CASHBACK = 'CASHBACK',
}

export enum CouponEligibilityAudience {
  ALL_CUSTOMERS = 'ALL_CUSTOMERS',
  FIRST_TIME_ONLY = 'FIRST_TIME_ONLY',
  VIP_MEMBERS_ONLY = 'VIP_MEMBERS_ONLY',
  RETURNING_CUSTOMERS_ONLY = 'RETURNING_CUSTOMERS_ONLY',
  SPECIFIC_CUSTOMERS = 'SPECIFIC_CUSTOMERS',
}

export enum GiftCardStatus {
  ACTIVE = 'ACTIVE',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
  DISABLED = 'DISABLED',
}

export enum FlashSaleStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SOLD_OUT = 'SOLD_OUT',
  CANCELLED = 'CANCELLED',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  READ = 'READ',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum NotificationCategory {
  BOOKING = 'BOOKING',
  PAYMENT = 'PAYMENT',
  PROMOTIONS = 'PROMOTIONS',
  REMINDERS = 'REMINDERS',
  SYSTEM = 'SYSTEM',
  MARKETING = 'MARKETING',
}

export enum FileStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

export enum FileVisibility {
  PUBLIC = 'PUBLIC',
  AUTHENTICATED = 'AUTHENTICATED',
  TENANT = 'TENANT',
  PRIVATE = 'PRIVATE',
}

export enum FileCategory {
  PROFILE = 'PROFILE',
  SALON_LOGO = 'SALON_LOGO',
  SALON_GALLERY = 'SALON_GALLERY',
  BRANCH_COVER = 'BRANCH_COVER',
  SERVICE_IMAGE = 'SERVICE_IMAGE',
  STAFF_PHOTO = 'STAFF_PHOTO',
  PRODUCT_IMAGE = 'PRODUCT_IMAGE',
  REVIEW_IMAGE = 'REVIEW_IMAGE',
  DOCUMENT = 'DOCUMENT',
  INVOICE_PDF = 'INVOICE_PDF',
  RECEIPT = 'RECEIPT',
  MARKETING_BANNER = 'MARKETING_BANNER',
  OTHER = 'OTHER',
}
