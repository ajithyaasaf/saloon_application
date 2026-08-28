import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition } from './error-code.interface';

/**
 * ERROR_CODES — Centralized registry of machine-readable error definitions.
 *
 * Numbering Ranges:
 *  - 001–099: Validation errors
 *  - 100–199: Business domain errors
 *  - 200–299: Authorization & authentication errors
 *  - 300–399: Infrastructure & internal errors
 *  - 400–499: External gateway & service errors
 *  - 500–599: System / Unknown errors
 *
 * Architecture ref: Phase 9.1 §4
 */
export const ERROR_CODES = Object.freeze({
  // ─── VALIDATION (001–099) ──────────────────────────────────────────────────
  VALIDATION: Object.freeze({
    INVALID_INPUT: {
      code: 'VALIDATION_001',
      status: HttpStatus.BAD_REQUEST,
      messageKey: 'validation.invalid_input',
      description: 'Request validation failed for one or more fields',
    } satisfies ErrorDefinition,
    MALFORMED_JSON: {
      code: 'VALIDATION_002',
      status: HttpStatus.BAD_REQUEST,
      messageKey: 'validation.malformed_json',
      description: 'Request payload is not valid JSON',
    } satisfies ErrorDefinition,
    INVALID_DATE_FORMAT: {
      code: 'VALIDATION_003',
      status: HttpStatus.BAD_REQUEST,
      messageKey: 'validation.invalid_date_format',
      description: 'Date string must be in ISO 8601 format (YYYY-MM-DD)',
    } satisfies ErrorDefinition,
  }),

  // ─── BUSINESS DOMAIN (100–199) ──────────────────────────────────────────────
  USER: Object.freeze({
    NOT_FOUND: {
      code: 'USER_101',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'user.not_found',
      description: 'Requested user profile does not exist',
    } satisfies ErrorDefinition,
    PHONE_EXISTS: {
      code: 'USER_102',
      status: HttpStatus.CONFLICT,
      messageKey: 'user.phone_exists',
      description: 'Phone number is already registered to another account',
    } satisfies ErrorDefinition,
    EMAIL_EXISTS: {
      code: 'USER_103',
      status: HttpStatus.CONFLICT,
      messageKey: 'user.email_exists',
      description: 'Email address is already registered to another account',
    } satisfies ErrorDefinition,
    UNDERAGE: {
      code: 'USER_104',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      messageKey: 'user.underage',
      description: 'User must be at least 13 years old to register',
    } satisfies ErrorDefinition,
    INACTIVE: {
      code: 'USER_105',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      messageKey: 'user.inactive',
      description: 'User account is inactive or suspended',
    } satisfies ErrorDefinition,
  }),

  SALON: Object.freeze({
    NOT_FOUND: {
      code: 'SALON_101',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'salon.not_found',
      description: 'Requested salon profile does not exist',
    } satisfies ErrorDefinition,
    CLOSED: {
      code: 'SALON_102',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      messageKey: 'salon.closed',
      description: 'Salon is closed on the requested date',
    } satisfies ErrorDefinition,
  }),

  BRANCH: Object.freeze({
    NOT_FOUND: {
      code: 'BRANCH_101',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'branch.not_found',
      description: 'Requested salon branch does not exist',
    } satisfies ErrorDefinition,
  }),

  STAFF: Object.freeze({
    NOT_FOUND: {
      code: 'STAFF_101',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'staff.not_found',
      description: 'Requested staff member does not exist',
    } satisfies ErrorDefinition,
    UNAVAILABLE: {
      code: 'STAFF_102',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      messageKey: 'staff.unavailable',
      description: 'Staff member is unavailable at the requested time',
    } satisfies ErrorDefinition,
  }),

  SERVICE: Object.freeze({
    NOT_FOUND: {
      code: 'SERVICE_101',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'service.not_found',
      description: 'Requested salon service does not exist',
    } satisfies ErrorDefinition,
  }),

  BOOKING: Object.freeze({
    SLOT_TAKEN: {
      code: 'BOOKING_101',
      status: HttpStatus.CONFLICT,
      messageKey: 'booking.slot_taken',
      description: 'Requested appointment slot has already been booked',
    } satisfies ErrorDefinition,
    INVALID_TIME: {
      code: 'BOOKING_102',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      messageKey: 'booking.invalid_time',
      description: 'Appointment time is outside operating hours',
    } satisfies ErrorDefinition,
  }),

  PAYMENT: Object.freeze({
    FAILED: {
      code: 'PAYMENT_101',
      status: HttpStatus.BAD_REQUEST,
      messageKey: 'payment.failed',
      description: 'Payment transaction failed or was declined',
    } satisfies ErrorDefinition,
    ALREADY_PAID: {
      code: 'PAYMENT_102',
      status: HttpStatus.CONFLICT,
      messageKey: 'payment.already_paid',
      description: 'Booking has already been paid in full',
    } satisfies ErrorDefinition,
  }),

  REVIEW: Object.freeze({
    NOT_FOUND: {
      code: 'REVIEW_101',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'review.not_found',
      description: 'Requested review does not exist',
    } satisfies ErrorDefinition,
  }),

  COUPON: Object.freeze({
    NOT_FOUND: {
      code: 'COUPON_101',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'coupon.not_found',
      description: 'Requested coupon code is invalid or expired',
    } satisfies ErrorDefinition,
  }),

  SEARCH: Object.freeze({
    INVALID_QUERY: {
      code: 'SEARCH_101',
      status: HttpStatus.BAD_REQUEST,
      messageKey: 'search.invalid_query',
      description: 'Search query parameter is invalid',
    } satisfies ErrorDefinition,
  }),

  ANALYTICS: Object.freeze({
    INVALID_RANGE: {
      code: 'ANALYTICS_101',
      status: HttpStatus.BAD_REQUEST,
      messageKey: 'analytics.invalid_range',
      description: 'Analytics date range exceeds maximum allowed window',
    } satisfies ErrorDefinition,
  }),

  INVENTORY: Object.freeze({
    OUT_OF_STOCK: {
      code: 'INVENTORY_101',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      messageKey: 'inventory.out_of_stock',
      description: 'Requested product item is out of stock',
    } satisfies ErrorDefinition,
    PRODUCT_NOT_FOUND: {
      code: 'INVENTORY_102',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.product_not_found',
      description: 'Requested product not found',
    } satisfies ErrorDefinition,
    VARIANT_NOT_FOUND: {
      code: 'INVENTORY_103',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.variant_not_found',
      description: 'Requested product variant not found',
    } satisfies ErrorDefinition,
    CATEGORY_NOT_FOUND: {
      code: 'INVENTORY_104',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.category_not_found',
      description: 'Requested product category not found',
    } satisfies ErrorDefinition,
    BRAND_NOT_FOUND: {
      code: 'INVENTORY_105',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.brand_not_found',
      description: 'Requested brand not found',
    } satisfies ErrorDefinition,
    UOM_NOT_FOUND: {
      code: 'INVENTORY_106',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.uom_not_found',
      description: 'Requested unit of measure not found',
    } satisfies ErrorDefinition,
    SUPPLIER_NOT_FOUND: {
      code: 'INVENTORY_107',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.supplier_not_found',
      description: 'Requested supplier not found',
    } satisfies ErrorDefinition,
    PURCHASE_ORDER_NOT_FOUND: {
      code: 'INVENTORY_108',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.po_not_found',
      description: 'Requested purchase order not found',
    } satisfies ErrorDefinition,
    GRN_NOT_FOUND: {
      code: 'INVENTORY_109',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.grn_not_found',
      description: 'Requested goods received note not found',
    } satisfies ErrorDefinition,
    STOCK_NOT_FOUND: {
      code: 'INVENTORY_110',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.stock_not_found',
      description: 'Requested inventory stock record not found',
    } satisfies ErrorDefinition,
    TRANSFER_NOT_FOUND: {
      code: 'INVENTORY_111',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.transfer_not_found',
      description: 'Requested stock transfer not found',
    } satisfies ErrorDefinition,
    ADJUSTMENT_NOT_FOUND: {
      code: 'INVENTORY_112',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.adjustment_not_found',
      description: 'Requested stock adjustment not found',
    } satisfies ErrorDefinition,
    AUDIT_NOT_FOUND: {
      code: 'INVENTORY_113',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.audit_not_found',
      description: 'Requested stock audit not found',
    } satisfies ErrorDefinition,
    USAGE_NOT_FOUND: {
      code: 'INVENTORY_114',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.usage_not_found',
      description: 'Requested product usage not found',
    } satisfies ErrorDefinition,
    ALERT_NOT_FOUND: {
      code: 'INVENTORY_115',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'inventory.alert_not_found',
      description: 'Requested low stock alert not found',
    } satisfies ErrorDefinition,
    INVALID_STATE: {
      code: 'INVENTORY_116',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      messageKey: 'inventory.invalid_state',
      description: 'Operation not permitted in current state',
    } satisfies ErrorDefinition,
    INSUFFICIENT_STOCK: {
      code: 'INVENTORY_117',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      messageKey: 'inventory.insufficient_stock',
      description: 'Insufficient stock for requested operation',
    } satisfies ErrorDefinition,
    NEGATIVE_STOCK: {
      code: 'INVENTORY_118',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      messageKey: 'inventory.negative_stock',
      description: 'Operation would result in negative inventory',
    } satisfies ErrorDefinition,
  }),

  CRM: Object.freeze({
    CUSTOMER_EXISTS: {
      code: 'CRM_101',
      status: HttpStatus.CONFLICT,
      messageKey: 'crm.customer_exists',
      description: 'Customer record already exists in salon CRM',
    } satisfies ErrorDefinition,
  }),

  // ─── AUTHORIZATION & AUTHENTICATION (200–299) ────────────────────────────────
  AUTH: Object.freeze({
    TOKEN_INVALID: {
      code: 'AUTH_201',
      status: HttpStatus.UNAUTHORIZED,
      messageKey: 'auth.token_invalid',
      description: 'Authentication token is invalid or expired',
    } satisfies ErrorDefinition,
    OTP_INVALID: {
      code: 'AUTH_202',
      status: HttpStatus.UNAUTHORIZED,
      messageKey: 'auth.otp_invalid',
      description: 'Phone OTP is invalid or expired',
    } satisfies ErrorDefinition,
    CREDENTIALS_INVALID: {
      code: 'AUTH_203',
      status: HttpStatus.UNAUTHORIZED,
      messageKey: 'auth.credentials_invalid',
      description: 'Invalid phone or password combination',
    } satisfies ErrorDefinition,
    FORBIDDEN: {
      code: 'AUTH_204',
      status: HttpStatus.FORBIDDEN,
      messageKey: 'auth.forbidden',
      description: 'Authenticated user lacks required role permissions',
    } satisfies ErrorDefinition,
    RATE_LIMITED: {
      code: 'AUTH_205',
      status: HttpStatus.TOO_MANY_REQUESTS,
      messageKey: 'auth.rate_limited',
      description: 'Too many authentication attempts. Please try again later',
    } satisfies ErrorDefinition,
  }),

  // ─── INFRASTRUCTURE & TECHNICAL (300–399) ───────────────────────────────────
  MEDIA: Object.freeze({
    INVALID_TYPE: {
      code: 'MEDIA_301',
      status: HttpStatus.BAD_REQUEST,
      messageKey: 'media.invalid_type',
      description: 'File type not supported (only JPEG, PNG, and WebP allowed)',
    } satisfies ErrorDefinition,
    TOO_LARGE: {
      code: 'MEDIA_302',
      status: HttpStatus.PAYLOAD_TOO_LARGE,
      messageKey: 'media.too_large',
      description: 'File size exceeds maximum allowed limit',
    } satisfies ErrorDefinition,
    UPLOAD_FAILED: {
      code: 'MEDIA_303',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      messageKey: 'media.upload_failed',
      description: 'Failed to upload asset to storage provider',
    } satisfies ErrorDefinition,
    NOT_FOUND: {
      code: 'MEDIA_304',
      status: HttpStatus.NOT_FOUND,
      messageKey: 'media.not_found',
      description: 'Requested storage object was not found',
    } satisfies ErrorDefinition,
    ACCESS_DENIED: {
      code: 'MEDIA_305',
      status: HttpStatus.FORBIDDEN,
      messageKey: 'media.access_denied',
      description: 'Access to the requested storage object was denied',
    } satisfies ErrorDefinition,
    DOWNLOAD_FAILED: {
      code: 'MEDIA_306',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      messageKey: 'media.download_failed',
      description: 'Failed to download asset from storage provider',
    } satisfies ErrorDefinition,
    DELETE_FAILED: {
      code: 'MEDIA_307',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      messageKey: 'media.delete_failed',
      description: 'Failed to delete asset from storage provider',
    } satisfies ErrorDefinition,
    CONFIG_ERROR: {
      code: 'MEDIA_308',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      messageKey: 'media.config_error',
      description: 'Storage provider configuration is invalid or missing required credentials',
    } satisfies ErrorDefinition,
    INVALID_KEY: {
      code: 'MEDIA_309',
      status: HttpStatus.BAD_REQUEST,
      messageKey: 'media.invalid_key',
      description: 'Storage object key contains invalid or dangerous characters',
    } satisfies ErrorDefinition,
  }),

  NOTIFICATION: Object.freeze({
    DISPATCH_FAILED: {
      code: 'NOTIFICATION_301',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      messageKey: 'notification.dispatch_failed',
      description: 'Failed to dispatch notification job to queue',
    } satisfies ErrorDefinition,
  }),

  QUEUE: Object.freeze({
    DISPATCH_FAILED: {
      code: 'QUEUE_301',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      messageKey: 'queue.dispatch_failed',
      description: 'Failed to enqueue background job to BullMQ',
    } satisfies ErrorDefinition,
  }),

  CACHE: Object.freeze({
    CONNECTION_ERROR: {
      code: 'CACHE_301',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      messageKey: 'cache.connection_error',
      description: 'Redis cache cluster connection failure',
    } satisfies ErrorDefinition,
  }),

  DATABASE: Object.freeze({
    UNIQUE_VIOLATION: {
      code: 'DATABASE_301',
      status: HttpStatus.CONFLICT,
      messageKey: 'database.unique_violation',
      description: 'Database unique constraint violation',
    } satisfies ErrorDefinition,
    UNHANDLED_ERROR: {
      code: 'DATABASE_302',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      messageKey: 'database.unhandled_error',
      description: 'Unhandled database transaction failure',
    } satisfies ErrorDefinition,
  }),

  // ─── EXTERNAL SERVICES & GATEWAYS (400–499) ────────────────────────────────
  EXTERNAL_SERVICE: Object.freeze({
    GATEWAY_ERROR: {
      code: 'EXT_401',
      status: HttpStatus.BAD_GATEWAY,
      messageKey: 'ext.third_party_error',
      description: 'Third-party gateway or SMS/Payment API returned an error',
    } satisfies ErrorDefinition,
  }),

  // ─── SYSTEM / UNKNOWN (500–599) ────────────────────────────────────────────
  SYSTEM: Object.freeze({
    INTERNAL_ERROR: {
      code: 'SYSTEM_500',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      messageKey: 'system.internal_error',
      description: 'An unhandled internal server error occurred',
    } satisfies ErrorDefinition,
  }),
});

/** Strongly-typed union of all error categories */
export type ErrorCategory = keyof typeof ERROR_CODES;

/** Strongly-typed union of all machine-readable error codes */
export type DomainErrorCode =
  typeof ERROR_CODES[ErrorCategory][keyof typeof ERROR_CODES[ErrorCategory]]['code'];
