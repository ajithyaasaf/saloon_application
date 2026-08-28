/**
 * Global Platform Constants, Limits, Pagination Defaults, and Header Keys.
 */

export const PLATFORM_CONSTANTS = {
  APP_NAME: 'Saloon Platform',
  DEFAULT_CURRENCY: 'INR',
  DEFAULT_TIMEZONE: 'Asia/Kolkata',
  DEFAULT_LOCALE: 'en-IN',
  DEFAULT_GST_RATE_PERCENT: 18,

  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  UPLOAD_LIMITS: {
    MAX_AVATAR_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
    MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
    MAX_DOCUMENT_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
    ALLOWED_IMAGE_MIME_TYPES: [
      'image/jpeg',
      'image/png',
      'image/webp',
    ] as const,
    ALLOWED_DOCUMENT_MIME_TYPES: [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ] as const,
  },

  BOOKING: {
    DEFAULT_BUFFER_MINUTES: 15,
    MIN_CANCELLATION_LEAD_HOURS: 2,
    MAX_ADVANCE_BOOKING_DAYS: 30,
    LOCK_TTL_SECONDS: 300, // 5 minutes checkout lock
  },

  RATE_LIMITS: {
    DEFAULT: { TTL_MS: 60000, LIMIT: 60 },
    AUTH_OTP: { TTL_MS: 60000, LIMIT: 5 },
    AUTH_LOGIN: { TTL_MS: 60000, LIMIT: 10 },
    BOOKING_LOCK: { TTL_MS: 60000, LIMIT: 15 },
    SEARCH: { TTL_MS: 60000, LIMIT: 60 },
  },

  SECURITY: {
    OTP_EXPIRY_SECONDS: 300, // 5 minutes
    OTP_MAX_ATTEMPTS: 3,
    ACCESS_TOKEN_EXPIRY_SECONDS: 900, // 15 minutes
    REFRESH_TOKEN_EXPIRY_DAYS: 30,
  },

  HEADERS: {
    REQUEST_ID: 'x-request-id',
    CORRELATION_ID: 'x-correlation-id',
    AUTHORIZATION: 'authorization',
    TIMEZONE: 'x-client-timezone',
  },
} as const;
