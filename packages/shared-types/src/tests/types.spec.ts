import * as SharedTypes from '../index.js';
import {
  BookingStatus,
  DayOfWeek,
  FileCategory,
  FileStatus,
  FileVisibility,
  Gender,
  InvoiceStatus,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  PaymentMethod,
  PaymentStatus,
  ReviewRating,
  SalonStatus,
  UserRole,
} from '../enums/index.js';

describe('@saloon/shared-types Exports & Enum Consistency', () => {
  it('should export all canonical domain enums', () => {
    expect(UserRole.SUPER_ADMIN).toBe('SUPER_ADMIN');
    expect(UserRole.SALON_OWNER).toBe('SALON_OWNER');
    expect(UserRole.SALON_MANAGER).toBe('SALON_MANAGER');
    expect(UserRole.SALON_STAFF).toBe('SALON_STAFF');
    expect(UserRole.CUSTOMER).toBe('CUSTOMER');

    expect(Gender.MALE).toBe('MALE');
    expect(Gender.FEMALE).toBe('FEMALE');
    expect(Gender.OTHER).toBe('OTHER');

    expect(SalonStatus.APPROVED).toBe('APPROVED');
    expect(DayOfWeek.MONDAY).toBe('MONDAY');

    expect(BookingStatus.PENDING).toBe('PENDING');
    expect(BookingStatus.CONFIRMED).toBe('CONFIRMED');
    expect(BookingStatus.COMPLETED).toBe('COMPLETED');
    expect(BookingStatus.CANCELLED).toBe('CANCELLED');

    expect(PaymentStatus.PAID).toBe('PAID');
    expect(PaymentMethod.UPI).toBe('UPI');
    expect(PaymentMethod.CARD).toBe('CARD');
    expect(InvoiceStatus.ISSUED).toBe('ISSUED');

    expect(ReviewRating.FIVE).toBe(5);

    expect(NotificationChannel.IN_APP).toBe('IN_APP');
    expect(NotificationChannel.PUSH).toBe('PUSH');
    expect(NotificationPriority.HIGH).toBe('HIGH');
    expect(NotificationStatus.SENT).toBe('SENT');

    expect(FileStatus.READY).toBe('READY');
    expect(FileVisibility.PUBLIC).toBe('PUBLIC');
    expect(FileVisibility.PRIVATE).toBe('PRIVATE');
    expect(FileCategory.PROFILE).toBe('PROFILE');
    expect(FileCategory.SALON_LOGO).toBe('SALON_LOGO');
  });

  it('should instantiate and typecheck common response envelopes', () => {
    const successResponse: SharedTypes.ApiResponse<{ id: string }> = {
      success: true,
      statusCode: 200,
      message: 'OK',
      data: { id: 'test_123' },
      timestamp: new Date().toISOString(),
      requestId: 'req_test',
    };

    expect(successResponse.success).toBe(true);
    expect(successResponse.data.id).toBe('test_123');

    const errorResponse: SharedTypes.ApiErrorResponse = {
      success: false,
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
      message: 'Invalid input',
      timestamp: new Date().toISOString(),
    };

    expect(errorResponse.success).toBe(false);
    expect(errorResponse.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should verify pagination metadata contracts', () => {
    const paginated: SharedTypes.PaginatedResult<string> = {
      items: ['a', 'b'],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    expect(paginated.items.length).toBe(2);
    expect(paginated.total).toBe(2);
  });
});
