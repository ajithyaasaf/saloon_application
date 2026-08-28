import { API_ROUTES } from '../routes.constant.js';
import { PLATFORM_CONSTANTS } from '../platform.constant.js';

describe('@saloon/config Constants & Routes', () => {
  it('should define all API route namespaces', () => {
    expect(API_ROUTES.AUTH.LOGIN_PASSWORD).toBe('/api/v1/auth/login');
    expect(API_ROUTES.AUTH.REFRESH_TOKEN).toBe('/api/v1/auth/refresh');
    expect(API_ROUTES.USERS.ME).toBe('/api/v1/users/me');
    expect(API_ROUTES.SALONS.BRANCHES.LIST('salon_123')).toBe('/api/v1/salons/salon_123/branches');
    expect(API_ROUTES.BOOKING.CREATE).toBe('/api/v1/booking');
    expect(API_ROUTES.PAYMENT.INITIATE).toBe('/api/v1/payment/initiate');
    expect(API_ROUTES.MEDIA.PRESIGNED_UPLOAD).toBe('/api/v1/media/upload/presigned');
    expect(API_ROUTES.MEDIA.GET_ASSET('asset_123')).toBe('/api/v1/media/assets/asset_123');
  });

  it('should define platform limits and defaults', () => {
    expect(PLATFORM_CONSTANTS.DEFAULT_CURRENCY).toBe('INR');
    expect(PLATFORM_CONSTANTS.DEFAULT_TIMEZONE).toBe('Asia/Kolkata');
    expect(PLATFORM_CONSTANTS.DEFAULT_GST_RATE_PERCENT).toBe(18);
    expect(PLATFORM_CONSTANTS.PAGINATION.DEFAULT_LIMIT).toBe(20);
    expect(PLATFORM_CONSTANTS.UPLOAD_LIMITS.MAX_AVATAR_SIZE_BYTES).toBe(5 * 1024 * 1024);
    expect(PLATFORM_CONSTANTS.UPLOAD_LIMITS.ALLOWED_IMAGE_MIME_TYPES).toContain('image/webp');
  });

  it('should define rate limit tiers and thresholds', () => {
    expect(PLATFORM_CONSTANTS.RATE_LIMITS.DEFAULT.LIMIT).toBe(60);
    expect(PLATFORM_CONSTANTS.RATE_LIMITS.AUTH_OTP.LIMIT).toBe(5);
    expect(PLATFORM_CONSTANTS.RATE_LIMITS.AUTH_LOGIN.LIMIT).toBe(10);
    expect(PLATFORM_CONSTANTS.RATE_LIMITS.BOOKING_LOCK.LIMIT).toBe(15);
  });
});
