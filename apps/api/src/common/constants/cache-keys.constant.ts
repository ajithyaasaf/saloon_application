/**
 * Redis cache key generators and templates.
 * Strict naming format: {entity}:{identifier}:{variant}
 *
 * Architecture ref: Phase 5 §11.1
 */
export const CACHE_KEYS = {
  SALON_PROFILE: (salonId: string) => `salon:${salonId}:profile`,
  BRANCH_PROFILE: (branchId: string) => `branch:${branchId}:profile`,
  BRANCH_SERVICES: (branchId: string) => `branch:${branchId}:services`,
  BRANCH_HOURS: (branchId: string) => `branch:${branchId}:hours`,
  PLATFORM_SETTINGS: () => `platform:settings`,
  SEARCH_GEO: (lat: number, lng: number, radius: number) =>
    `search:geo:${lat}:${lng}:${radius}`,
  SEARCH_TRENDING: (city: string) => `search:trending:${city}`,
  IDEMPOTENCY_KEY: (userId: string, key: string) =>
    `idempotency:${userId}:${key}`,
  OTP: (phone: string) => `otp:${phone}`,
  /** Tracks failed OTP verification attempts. Key deleted on success. */
  OTP_ATTEMPTS: (phone: string) => `otp:${phone}:attempts`,
  /** Tracks the number of OTP requests sent in the current rate-limit window. */
  OTP_RATE_LIMIT: (phone: string) => `otp:${phone}:ratelimit`,
  /** Tracks consecutive failed password login attempts for a B2B account. */
  LOGIN_FAILED: (email: string) => `ratelimit:login:failed:${email}`,
  /** Tracks token refresh requests per IP/identifier for rate limiting. */
  REFRESH_RATE_LIMIT: (identifier: string) => `ratelimit:auth:refresh:${identifier}`,
  /** Stores password reset token hash mapping to userId. TTL: 15 min. */
  PASSWORD_RESET: (tokenHash: string) => `password:reset:${tokenHash}`,
  /** Stores active password reset token hash for a user to enable pre-invalidation. */
  USER_RESET_TOKEN: (userId: string) => `password:reset:user:${userId}`,
  /** Stores pending email-change verification token hash for a user. TTL: 30 min. */
  USER_EMAIL_CHANGE: (userId: string) => `user:${userId}:email:change`,
  /** Tracks email-change request rate per user. Max 3 per hour. */
  USER_EMAIL_CHANGE_RATE: (userId: string) => `ratelimit:user:${userId}:email:change`,
  /** Stores pending phone-change OTP hash for a user. TTL: 5 min. */
  USER_PHONE_CHANGE: (userId: string) => `user:${userId}:phone:change`,
  /** Tracks phone-change OTP request rate per user. Max 3 per 15 min. */
  USER_PHONE_CHANGE_RATE: (userId: string) => `ratelimit:user:${userId}:phone:change`,
  /** Stores self-deletion confirmation token hash for a user. TTL: 30 min. */
  USER_DELETE_CONFIRM: (userId: string) => `user:${userId}:delete:confirm`,
  /** Avatar upload idempotency lock per user. TTL: 30 sec. */
  USER_AVATAR_LOCK: (userId: string) => `lock:user:${userId}:avatar`,
  /** Staff domain cache keys */
  STAFF_PROFILE: (staffId: string) => `staff:${staffId}:profile`,
  STAFF_SCHEDULE: (staffId: string, branchId: string) => `staff:${staffId}:branch:${branchId}:schedule`,
  STAFF_AVAILABILITY: (staffId: string, branchId: string, date: string) => `staff:${staffId}:branch:${branchId}:avail:${date}`,
  BRANCH_ROSTER: (branchId: string) => `branch:${branchId}:roster`,
  STAFF_LEAVES: (staffId: string) => `staff:${staffId}:leaves`,
  /** Payment domain cache keys */
  PAYMENT_DETAIL: (paymentId: string) => `payment:${paymentId}:detail`,
  CUSTOMER_PAYMENTS: (customerId: string) => `customer:${customerId}:payments`,
  BOOKING_PAYMENT: (bookingId: string) => `booking:${bookingId}:payment`,
  INVOICE_DETAIL: (invoiceId: string) => `invoice:${invoiceId}:detail`,
  /** Customer CRM domain cache keys */
  CUSTOMER_PROFILE: (id: string) => `customer:${id}:profile`,
  CUSTOMER_SEARCH: (salonId: string, hash: string) => `customer:search:${salonId}:${hash}`,
  CUSTOMER_LOYALTY: (id: string) => `customer:${id}:loyalty`,
  CUSTOMER_MEMBERSHIP: (id: string) => `customer:${id}:membership`,
  CUSTOMER_VISITS: (id: string) => `customer:${id}:visits`,
  CUSTOMER_WALLET: (id: string) => `customer:${id}:wallet`,
} as const;

export const CACHE_TTL = {
  STAFF_PROFILE: 1800, // 30 min
  STAFF_SCHEDULE: 3600, // 60 min
  STAFF_AVAILABILITY: 900, // 15 min
  BRANCH_ROSTER: 1800, // 30 min
  STAFF_LEAVES: 900, // 15 min
  SALON_PROFILE: 900, // 15 min
  BRANCH_PROFILE: 900, // 15 min
  BRANCH_SERVICES: 600, // 10 min
  BRANCH_HOURS: 3600, // 60 min
  PLATFORM_SETTINGS: 1800, // 30 min
  SEARCH_GEO: 300, // 5 min
  SEARCH_TRENDING: 1800, // 30 min
  IDEMPOTENCY: 86400, // 24 hours
  OTP: 300, // 5 min
  OTP_RATE_LIMIT_WINDOW: 900, // 15 min — max 3 requests per window
  OTP_LOCKOUT: 900, // 15 min — after 3 failed verification attempts
  PASSWORD_LOCK: 1800, // 30 min — after 5 consecutive failed password attempts
  REFRESH_RATE_LIMIT_WINDOW: 60, // 1 min — max 10 requests per minute
  PASSWORD_RESET: 900, // 15 min — password reset token expiry
  EMAIL_CHANGE: 1800, // 30 min — email change verification token expiry
  EMAIL_CHANGE_RATE_WINDOW: 3600, // 60 min — email change rate limit window (max 3 per hour)
  PHONE_CHANGE: 300, // 5 min — phone change OTP expiry
  PHONE_CHANGE_RATE_WINDOW: 900, // 15 min — phone OTP rate limit window (max 3 per 15 min)
  USER_DELETE_CONFIRM: 1800, // 30 min — self-deletion confirmation token expiry
  AVATAR_LOCK: 30, // 30 sec — avatar upload idempotency lock
  CUSTOMER_PROFILE: 1800, // 30 min
  CUSTOMER_LOYALTY: 900, // 15 min
  CUSTOMER_MEMBERSHIP: 1800, // 30 min
  CUSTOMER_VISITS: 1800, // 30 min
  CUSTOMER_WALLET: 900, // 15 min
  CUSTOMER_SEARCH: 300, // 5 min
} as const;