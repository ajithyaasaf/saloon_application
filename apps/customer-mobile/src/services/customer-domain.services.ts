import { API_ROUTES } from '@saloon/config';
import {
  AuthResponseDto,
  AvailableTimeSlotDto,
  BookingDto,
  BookingSummaryDto,
  BranchDto,
  CancelBookingRequestDto,
  CreateBookingRequestDto,
  CreateReviewRequestDto,
  CustomerProfileDto,
  FileAssetDto,
  FileCategory,
  FileVisibility,
  InitiatePaymentRequestDto,
  InitiatePresignedUploadRequestDto,
  InitiatePresignedUploadResponseDto,
  LoyaltyPointsHistoryDto,
  MembershipTierDto,
  NotificationItemDto,
  PaginatedResult,
  PaymentDto,
  ReviewDto,
  SalonDto,
  ServiceCategoryDto,
  ServiceDto,
  UnreadNotificationCountDto,
  UpdateUserPreferencesDto,
  UserProfileDto,
  ValidateCouponRequestDto,
  ValidateCouponResponseDto,
  VerifyOtpRequestDto,
  WalletTransactionDto,
} from '@saloon/shared-types';
import { apiClient, tokenStorage } from './api.service';

export interface ReservationLockResult {
  lockKey: string;
  expiresAt: string;
}

export const authService = {
  async sendOtp(phone: string): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>(
      API_ROUTES.AUTH.SEND_OTP,
      { phone },
      { skipAuth: true },
    );
    return res.data;
  },

  async verifyOtp(payload: VerifyOtpRequestDto): Promise<AuthResponseDto> {
    const res = await apiClient.post<AuthResponseDto>(
      API_ROUTES.AUTH.VERIFY_OTP,
      payload,
      { skipAuth: true },
    );
    if (res.data?.tokens) {
      await tokenStorage.setAccessToken(res.data.tokens.accessToken);
      await tokenStorage.setRefreshToken(res.data.tokens.refreshToken);
      tokenStorage.setUserSession(JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ROUTES.AUTH.LOGOUT, {});
    } catch {
      // Best-effort logout
    } finally {
      tokenStorage.clearTokens();
    }
  },

  async getMe(): Promise<UserProfileDto> {
    const res = await apiClient.get<UserProfileDto>(API_ROUTES.USERS.ME);
    return res.data;
  },
};

export const salonDiscoveryService = {
  async getSalons(): Promise<SalonDto[]> {
    const res = await apiClient.get<SalonDto[]>(API_ROUTES.SALONS.LIST, {
      skipAuth: true,
    });
    return res.data || [];
  },

  async getSalon(id: string): Promise<SalonDto> {
    const res = await apiClient.get<SalonDto>(API_ROUTES.SALONS.GET(id), {
      skipAuth: true,
    });
    return res.data;
  },

  async getBranches(salonId: string): Promise<BranchDto[]> {
    const res = await apiClient.get<BranchDto[]>(
      API_ROUTES.SALONS.BRANCHES.LIST(salonId),
      { skipAuth: true },
    );
    return res.data || [];
  },

  async getBranch(salonId: string, branchId: string): Promise<BranchDto> {
    const res = await apiClient.get<BranchDto>(
      API_ROUTES.SALONS.BRANCHES.GET(salonId, branchId),
      { skipAuth: true },
    );
    return res.data;
  },
};

export const catalogService = {
  async getCategories(): Promise<ServiceCategoryDto[]> {
    const res = await apiClient.get<ServiceCategoryDto[]>(
      API_ROUTES.SERVICE_CATALOG.CATEGORIES.LIST,
      { skipAuth: true },
    );
    return res.data || [];
  },

  async getServices(categoryId?: string): Promise<ServiceDto[]> {
    const params = categoryId ? { categoryId } : undefined;
    const res = await apiClient.get<ServiceDto[]>(
      API_ROUTES.SERVICE_CATALOG.SERVICES.LIST,
      { params, skipAuth: true },
    );
    return res.data || [];
  },
};

export const customerBookingService = {
  async getAvailableSlots(
    branchId: string,
    date: string,
    serviceIds?: string[],
  ): Promise<AvailableTimeSlotDto[]> {
    const res = await apiClient.get<AvailableTimeSlotDto[]>(
      API_ROUTES.BOOKING.SLOTS,
      {
        params: { branchId, date, serviceIds: serviceIds?.join(',') },
        skipAuth: true,
      },
    );
    return res.data || [];
  },

  async acquireReservationLock(dto: {
    branchId: string;
    slotDate: string;
    startTime: string;
    endTime: string;
    staffId?: string;
  }): Promise<ReservationLockResult> {
    const res = await apiClient.post<ReservationLockResult>(
      '/api/v1/customer/bookings/reservation',
      dto,
    );
    return res.data;
  },

  async releaseReservationLock(lockKey: string): Promise<void> {
    await apiClient.delete(`/api/v1/customer/bookings/reservation/${lockKey}`);
  },

  async createBooking(dto: CreateBookingRequestDto): Promise<BookingDto> {
    const res = await apiClient.post<BookingDto>(
      API_ROUTES.BOOKING.CREATE,
      dto,
    );
    return res.data;
  },

  async getMyBookings(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<BookingSummaryDto>> {
    const res = await apiClient.get<PaginatedResult<BookingSummaryDto>>(
      API_ROUTES.BOOKING.MY_BOOKINGS,
      { params: { page, limit } },
    );
    return res.data;
  },

  async getBookingDetails(id: string): Promise<BookingDto> {
    const res = await apiClient.get<BookingDto>(
      API_ROUTES.BOOKING.GET(id),
    );
    return res.data;
  },

  async getBookingById(id: string): Promise<BookingDto> {
    return this.getBookingDetails(id);
  },

  async cancelBooking(
    id: string,
    reason: string = 'Cancelled by customer',
  ): Promise<BookingDto> {
    const payload: CancelBookingRequestDto = { reason };
    const res = await apiClient.post<BookingDto>(
      API_ROUTES.BOOKING.CANCEL(id),
      payload,
    );
    return res.data;
  },
};

export const paymentService = {
  async initiatePayment(dto: InitiatePaymentRequestDto): Promise<PaymentDto> {
    const res = await apiClient.post<PaymentDto>(
      API_ROUTES.PAYMENT.INITIATE,
      dto,
    );
    return res.data;
  },

  async getMyPayments(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<PaymentDto>> {
    const res = await apiClient.get<PaginatedResult<PaymentDto>>(
      '/api/v1/customer/payments',
      { params: { page, limit } },
    );
    return res.data;
  },
};

export const customerAccountService = {
  async getProfile(): Promise<CustomerProfileDto> {
    const res = await apiClient.get<CustomerProfileDto>(
      '/api/v1/customer/customers/profile',
    );
    return res.data;
  },

  async updatePreferences(
    dto: UpdateUserPreferencesDto,
  ): Promise<UpdateUserPreferencesDto> {
    const res = await apiClient.patch<UpdateUserPreferencesDto>(
      API_ROUTES.USERS.PREFERENCES,
      dto,
    );
    return res.data;
  },

  async getWalletLedger(): Promise<WalletTransactionDto[]> {
    const res = await apiClient.get<WalletTransactionDto[]>(
      '/api/v1/customer/customers/wallet',
    );
    return res.data || [];
  },

  async getLoyaltyLedger(): Promise<LoyaltyPointsHistoryDto[]> {
    const res = await apiClient.get<LoyaltyPointsHistoryDto[]>(
      '/api/v1/customer/customers/loyalty',
    );
    return res.data || [];
  },

  async getMembership(): Promise<MembershipTierDto | null> {
    const res = await apiClient.get<MembershipTierDto | null>(
      '/api/v1/customer/customers/membership',
    );
    return res.data;
  },
};

export const reviewService = {
  async createReview(dto: CreateReviewRequestDto): Promise<ReviewDto> {
    const res = await apiClient.post<ReviewDto>(
      API_ROUTES.REVIEWS.CREATE,
      dto,
    );
    return res.data;
  },

  async getBranchReviews(branchId: string): Promise<ReviewDto[]> {
    const res = await apiClient.get<ReviewDto[]>(
      API_ROUTES.REVIEWS.LIST_FOR_BRANCH(branchId),
      { skipAuth: true },
    );
    return res.data || [];
  },

  async voteHelpful(reviewId: string): Promise<{ success: boolean }> {
    const res = await apiClient.post<{ success: boolean }>(
      API_ROUTES.REVIEWS.VOTE_HELPFUL(reviewId),
      {},
    );
    return res.data;
  },
};

export const promotionService = {
  async validateCoupon(
    dto: ValidateCouponRequestDto,
  ): Promise<ValidateCouponResponseDto> {
    const res = await apiClient.post<ValidateCouponResponseDto>(
      API_ROUTES.PROMOTIONS.COUPONS.VALIDATE,
      dto,
    );
    return res.data;
  },

  async redeemGiftCard(
    code: string,
  ): Promise<{ success: boolean; balance: number }> {
    const res = await apiClient.post<{ success: boolean; balance: number }>(
      API_ROUTES.PROMOTIONS.GIFT_CARDS.REDEEM(code),
      {},
    );
    return res.data;
  },
};

export const notificationService = {
  async getInbox(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<NotificationItemDto>> {
    const res = await apiClient.get<PaginatedResult<NotificationItemDto>>(
      API_ROUTES.NOTIFICATIONS.INBOX,
      { params: { page, limit } },
    );
    return res.data;
  },

  async getUnreadCount(): Promise<UnreadNotificationCountDto> {
    const res = await apiClient.get<UnreadNotificationCountDto>(
      API_ROUTES.NOTIFICATIONS.UNREAD_COUNT,
    );
    return res.data;
  },

  async markAsRead(id: string): Promise<NotificationItemDto> {
    const res = await apiClient.patch<NotificationItemDto>(
      API_ROUTES.NOTIFICATIONS.MARK_READ(id),
      {},
    );
    return res.data;
  },
};

export const mediaService = {
  async uploadMedia(
    fileName: string,
    mimeType: string,
    fileSizeBytes: number,
    category: FileCategory = FileCategory.PROFILE,
  ): Promise<FileAssetDto> {
    const payload: InitiatePresignedUploadRequestDto = {
      fileName,
      mimeType,
      fileSizeBytes,
      category,
      visibility: FileVisibility.PUBLIC,
    };

    const presigned = await apiClient.post<InitiatePresignedUploadResponseDto>(
      API_ROUTES.MEDIA.PRESIGNED_UPLOAD,
      payload,
    );

    const assetId = presigned.data?.assetId || (presigned.data as any)?.id;

    const finalized = await apiClient.post<{ asset: FileAssetDto }>(
      API_ROUTES.MEDIA.FINALIZE_UPLOAD(assetId),
      {},
    );

    return (finalized.data as any)?.asset || (finalized.data as any);
  },
  async requestPresignedUpload(
    fileName: string,
    mimeType: string,
    fileSizeBytes: number,
    category: FileCategory = FileCategory.PROFILE,
  ): Promise<FileAssetDto> {
    return this.uploadMedia(fileName, mimeType, fileSizeBytes, category);
  },
};

export const mediaUploadService = mediaService;

export const customerProfileService = {
  async updateProfile(dto: { firstName?: string; lastName?: string; email?: string }): Promise<UserProfileDto> {
    const res = await apiClient.patch<UserProfileDto>(API_ROUTES.USERS.ME, dto);
    return res.data;
  },
};
