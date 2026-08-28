/**
 * Centralized API Routes dictionary matching the @saloon/api v1 routes.
 */

export const API_ROUTES = {
  AUTH: {
    SEND_OTP: '/api/v1/auth/otp/request',
    VERIFY_OTP: '/api/v1/auth/otp/verify',
    LOGIN_PASSWORD: '/api/v1/auth/login',
    REFRESH_TOKEN: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
    LOGOUT_ALL: '/api/v1/auth/logout-all',
    SESSIONS: '/api/v1/auth/sessions',
    CHANGE_PASSWORD: '/api/v1/auth/password/change',
    FORGOT_PASSWORD: '/api/v1/auth/password/forgot',
    RESET_PASSWORD: '/api/v1/auth/password/reset',
  },
  USERS: {
    ME: '/api/v1/users/me',
    UPDATE_ME: '/api/v1/users/me',
    AVATAR: '/api/v1/users/me/avatar',
    REQUEST_EMAIL_CHANGE: '/api/v1/users/me/email/request',
    CONFIRM_EMAIL_CHANGE: '/api/v1/users/me/email/confirm',
    REQUEST_PHONE_CHANGE: '/api/v1/users/me/phone/request',
    CONFIRM_PHONE_CHANGE: '/api/v1/users/me/phone/confirm',
    PREFERENCES: '/api/v1/users/me/preferences',
    ADMIN_LIST: '/api/v1/users',
    ADMIN_GET: (id: string) => `/api/v1/users/${id}`,
    ADMIN_UPDATE: (id: string) => `/api/v1/users/${id}`,
    ADMIN_DELETE: (id: string) => `/api/v1/users/${id}`,
  },
  SALONS: {
    LIST: '/api/v1/salons',
    GET: (id: string) => `/api/v1/salons/${id}`,
    GET_BY_SLUG: (slug: string) => `/api/v1/salons/slug/${slug}`,
    CREATE: '/api/v1/salons',
    UPDATE: (id: string) => `/api/v1/salons/${id}`,
    BRANCHES: {
      LIST: (salonId: string) => `/api/v1/salons/${salonId}/branches`,
      GET: (salonId: string, branchId: string) => `/api/v1/salons/${salonId}/branches/${branchId}`,
      CREATE: (salonId: string) => `/api/v1/salons/${salonId}/branches`,
      UPDATE: (salonId: string, branchId: string) => `/api/v1/salons/${salonId}/branches/${branchId}`,
      OPERATING_HOURS: (salonId: string, branchId: string) =>
        `/api/v1/salons/${salonId}/branches/${branchId}/operating-hours`,
      CLOSURES: (salonId: string, branchId: string) => `/api/v1/salons/${salonId}/branches/${branchId}/closures`,
      DELETE_CLOSURE: (salonId: string, branchId: string, closureId: string) =>
        `/api/v1/salons/${salonId}/branches/${branchId}/closures/${closureId}`,
    },
  },
  SERVICE_CATALOG: {
    CATEGORIES: {
      LIST: '/api/v1/services/categories',
      GET: (id: string) => `/api/v1/services/categories/${id}`,
      CREATE: '/api/v1/owner/services/categories',
      UPDATE: (id: string) => `/api/v1/owner/services/categories/${id}`,
      DELETE: (id: string) => `/api/v1/owner/services/categories/${id}`,
    },
    SERVICES: {
      LIST: '/api/v1/services',
      GET: (id: string) => `/api/v1/services/${id}`,
      CREATE: '/api/v1/owner/services',
      UPDATE: (id: string) => `/api/v1/owner/services/${id}`,
      DELETE: (id: string) => `/api/v1/owner/services/${id}`,
      BRANCH_PRICING: (branchId: string, serviceId: string) =>
        `/api/v1/owner/services/branches/${branchId}/services/${serviceId}/pricing`,
    },
  },
  STAFF: {
    LIST: '/api/v1/staff',
    GET: (id: string) => `/api/v1/staff/${id}`,
    CREATE: '/api/v1/staff',
    UPDATE: (id: string) => `/api/v1/staff/${id}`,
    SHIFTS: (staffId: string) => `/api/v1/staff/${staffId}/shifts`,
    LEAVES: {
      LIST: (staffId: string) => `/api/v1/staff/${staffId}/leaves`,
      REQUEST: (staffId: string) => `/api/v1/staff/${staffId}/leaves`,
      REVIEW: (staffId: string, leaveId: string) => `/api/v1/staff/${staffId}/leaves/${leaveId}/review`,
    },
  },
  BOOKING: {
    SLOTS: '/api/v1/booking/slots',
    CREATE: '/api/v1/booking',
    GET: (id: string) => `/api/v1/booking/${id}`,
    MY_BOOKINGS: '/api/v1/booking/me',
    BRANCH_BOOKINGS: (branchId: string) => `/api/v1/booking/branch/${branchId}`,
    RESCHEDULE: (id: string) => `/api/v1/booking/${id}/reschedule`,
    CANCEL: (id: string) => `/api/v1/booking/${id}/cancel`,
    UPDATE_STATUS: (id: string) => `/api/v1/booking/${id}/status`,
  },
  PAYMENT: {
    INITIATE: '/api/v1/payment/initiate',
    VERIFY: '/api/v1/payment/verify',
    GET: (id: string) => `/api/v1/payment/${id}`,
    REFUND: (id: string) => `/api/v1/payment/${id}/refund`,
    INVOICES: {
      GET: (id: string) => `/api/v1/payment/invoices/${id}`,
      MY_INVOICES: '/api/v1/payment/invoices/me',
    },
  },
  CUSTOMER: {
    ME: '/api/v1/customers/me',
    LOYALTY: '/api/v1/customers/me/loyalty',
    WALLET: '/api/v1/customers/me/wallet',
    FAVORITES: {
      LIST: '/api/v1/customers/me/favorites',
      ADD: '/api/v1/customers/me/favorites',
      REMOVE: (salonId: string) => `/api/v1/customers/me/favorites/${salonId}`,
    },
  },
  INVENTORY: {
    PRODUCTS: {
      LIST: '/api/v1/inventory/products',
      GET: (id: string) => `/api/v1/inventory/products/${id}`,
      CREATE: '/api/v1/inventory/products',
      UPDATE: (id: string) => `/api/v1/inventory/products/${id}`,
      DELETE: (id: string) => `/api/v1/inventory/products/${id}`,
    },
    STOCK: {
      BRANCH: (branchId: string) => `/api/v1/inventory/branches/${branchId}/stock`,
      ADJUST: (branchId: string) => `/api/v1/inventory/branches/${branchId}/stock/adjust`,
      MOVEMENTS: (branchId: string) => `/api/v1/inventory/branches/${branchId}/stock/movements`,
    },
    PURCHASE_ORDERS: {
      LIST: '/api/v1/inventory/purchase-orders',
      GET: (id: string) => `/api/v1/inventory/purchase-orders/${id}`,
      CREATE: '/api/v1/inventory/purchase-orders',
      UPDATE_STATUS: (id: string) => `/api/v1/inventory/purchase-orders/${id}/status`,
    },
    TRANSFERS: {
      LIST: '/api/v1/inventory/transfers',
      GET: (id: string) => `/api/v1/inventory/transfers/${id}`,
      CREATE: '/api/v1/inventory/transfers',
      RECEIVE: (id: string) => `/api/v1/inventory/transfers/${id}/receive`,
    },
  },
  REVIEWS: {
    LIST_FOR_BRANCH: (branchId: string) => `/api/v1/reviews/branch/${branchId}`,
    CREATE: '/api/v1/reviews',
    REPLY: (reviewId: string) => `/api/v1/reviews/${reviewId}/reply`,
    VOTE_HELPFUL: (reviewId: string) => `/api/v1/reviews/${reviewId}/helpful`,
    MODERATE: (reviewId: string) => `/api/v1/admin/reviews/${reviewId}/moderate`,
  },
  PROMOTIONS: {
    COUPONS: {
      LIST: '/api/v1/promotions/coupons',
      VALIDATE: '/api/v1/promotions/coupons/validate',
      CREATE: '/api/v1/promotions/coupons',
      UPDATE: (id: string) => `/api/v1/promotions/coupons/${id}`,
      DELETE: (id: string) => `/api/v1/promotions/coupons/${id}`,
    },
    GIFT_CARDS: {
      PURCHASE: '/api/v1/promotions/gift-cards',
      GET_BY_CODE: (code: string) => `/api/v1/promotions/gift-cards/${code}`,
      REDEEM: (code: string) => `/api/v1/promotions/gift-cards/${code}/redeem`,
    },
    FLASH_SALES: {
      LIST: '/api/v1/promotions/flash-sales',
      CREATE: '/api/v1/promotions/flash-sales',
    },
  },
  NOTIFICATIONS: {
    INBOX: '/api/v1/notifications/inbox',
    UNREAD_COUNT: '/api/v1/notifications/inbox/unread-count',
    MARK_READ: (id: string) => `/api/v1/notifications/inbox/${id}/read`,
    MARK_ALL_READ: '/api/v1/notifications/inbox/mark-all-read',
    PREFERENCES: '/api/v1/notifications/preferences',
    UPDATE_PREFERENCES: '/api/v1/notifications/preferences',
  },
  MEDIA: {
    PRESIGNED_UPLOAD: '/api/v1/media/upload/presigned',
    FINALIZE_UPLOAD: (id: string) => `/api/v1/media/upload/${id}/finalize`,
    DIRECT_UPLOAD: '/api/v1/media/upload/direct',
    GET_ASSET: (id: string) => `/api/v1/media/assets/${id}`,
    SIGNED_URL: (id: string) => `/api/v1/media/assets/${id}/signed-url`,
    UPDATE_METADATA: (id: string) => `/api/v1/media/assets/${id}/metadata`,
    DELETE_ASSET: (id: string) => `/api/v1/media/assets/${id}`,
  },
  HEALTH: {
    HEALTH: '/api/v1/health',
    READINESS: '/api/v1/health/readiness',
    LIVENESS: '/api/v1/health/liveness',
  },
} as const;
