import {
  AuthResponseDto,
  AuthSessionUserDto,
  BookingDto,
  BranchProductStockDto,
  CustomerProfileDto,
  FileAssetDto,
  PaginatedResult,
  PasswordLoginRequestDto,
  PaymentDto,
  RefundDto,
  SalonDto,
  ServiceCategoryDto,
  ServiceDto,
  StaffMemberDto,
  StockMovementDto,
  UserProfileDto,
  UserRole,
} from '@saloon/shared-types';
import { API_ROUTES } from '@saloon/config';
import { apiClient, tokenStorage } from './api.service';

// ─── AUTH SERVICE ─────────────────────────────────────────────────────────────
export const authService = {
  async login(credentials: PasswordLoginRequestDto): Promise<AuthResponseDto> {
    const res = await apiClient.post<AuthResponseDto>(
      API_ROUTES.AUTH.LOGIN_PASSWORD,
      credentials,
      { skipAuth: true }
    );
    const data = res.data as any;
    const accessToken = data?.tokens?.accessToken || data?.accessToken;
    const refreshToken = data?.tokens?.refreshToken || data?.refreshToken;

    if (accessToken) {
      tokenStorage.setAccessToken(accessToken);
    }
    if (refreshToken) {
      tokenStorage.setRefreshToken(refreshToken);
    }
    if (typeof window !== 'undefined' && data?.user) {
      localStorage.setItem(
        'saloon_admin_user_session',
        JSON.stringify(data.user)
      );
    }
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ROUTES.AUTH.LOGOUT, {});
    } catch {
      // Ignore network errors on logout
    } finally {
      tokenStorage.clearTokens();
    }
  },

  async getMe(): Promise<UserProfileDto> {
    const res = await apiClient.get<UserProfileDto>(API_ROUTES.USERS.ME);
    return res.data;
  },
};

// ─── ADMIN DASHBOARD STATS SERVICE ────────────────────────────────────────────
export const adminDashboardService = {
  async getPlatformStats() {
    const [custRes, bookRes, payRes, invRes, healthRes] = await Promise.allSettled([
      apiClient.get<any>('/api/v1/admin/customers/statistics'),
      apiClient.get<any>('/api/v1/admin/bookings/statistics'),
      apiClient.get<any>('/api/v1/admin/payments/statistics'),
      apiClient.get<any>('/api/v1/admin/inventory/statistics'),
      apiClient.get<any>('/api/v1/health/readiness'),
    ]);

    return {
      customers: custRes.status === 'fulfilled' ? custRes.value.data : null,
      bookings: bookRes.status === 'fulfilled' ? bookRes.value.data : null,
      payments: payRes.status === 'fulfilled' ? payRes.value.data : null,
      inventory: invRes.status === 'fulfilled' ? invRes.value.data : null,
      health: healthRes.status === 'fulfilled' ? healthRes.value.data : null,
    };
  },
};

// ─── ADMIN SALONS SERVICE ─────────────────────────────────────────────────────
export const adminSalonService = {
  async getSalons(params?: {
    status?: string;
    city?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: SalonDto[]; meta?: any }> {
    const res = await apiClient.get<any>(API_ROUTES.SALONS.LIST, {
      params,
    });
    const raw = res.data;
    const items = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.items)
      ? raw.items
      : [];

    const meta =
      res.meta?.pagination ??
      raw?.meta?.pagination ?? {
        total: items.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

    return {
      data: items,
      meta,
    };
  },

  async getSalon(id: string): Promise<SalonDto> {
    const res = await apiClient.get<SalonDto>(API_ROUTES.SALONS.GET(id));
    return res.data;
  },

  async approveSalon(id: string): Promise<SalonDto> {
    const res = await apiClient.post<SalonDto>(`/api/v1/admin/salons/${id}/approve`, {});
    return res.data;
  },

  async rejectSalon(id: string, reason: string): Promise<SalonDto> {
    const res = await apiClient.post<SalonDto>(`/api/v1/admin/salons/${id}/reject`, { reason });
    return res.data;
  },
};

// ─── ADMIN USERS & STAFF SERVICE ──────────────────────────────────────────────
export const adminUserService = {
  async listUsers(params?: {
    page?: number;
    limit?: number;
    role?: UserRole;
    search?: string;
    isActive?: boolean;
  }): Promise<{ users: UserProfileDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const res = await apiClient.get<any>(API_ROUTES.USERS.ADMIN_LIST, {
      params,
    });
    const items = res.data?.items ?? res.data ?? [];
    const meta = res.meta?.pagination ?? {
      total: items.length,
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      totalPages: 1,
    };
    return {
      users: items,
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
      totalPages: meta.totalPages,
    };
  },

  async getUserById(userId: string): Promise<UserProfileDto> {
    const res = await apiClient.get<UserProfileDto>(API_ROUTES.USERS.ADMIN_GET(userId));
    return res.data;
  },

  async updateUser(userId: string, data: any): Promise<UserProfileDto> {
    const res = await apiClient.patch<UserProfileDto>(API_ROUTES.USERS.ADMIN_UPDATE(userId), data);
    return res.data;
  },

  async suspendUser(userId: string): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>(`/api/v1/users/${userId}/suspend`, {});
    return res.data;
  },

  async restoreUser(userId: string): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>(`/api/v1/users/${userId}/restore`, {});
    return res.data;
  },

  async softDeleteUser(userId: string): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(API_ROUTES.USERS.ADMIN_DELETE(userId));
    return res.data;
  },

  async searchStaff(params?: {
    salonId?: string;
    branchId?: string;
    employmentStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: StaffMemberDto[]; meta?: any }> {
    const res = await apiClient.get<any>('/api/v1/admin/staff', { params });
    const raw = res.data;
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : [];
    return {
      data: items,
      meta: res.meta?.pagination ?? raw?.meta?.pagination ?? {
        total: items.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async approveLeave(leaveId: string, version: number = 1): Promise<any> {
    const res = await apiClient.post(`/api/v1/admin/staff/leave/${leaveId}/approve`, { version });
    return res.data;
  },

  async rejectLeave(leaveId: string, rejectionReason: string, version: number = 1): Promise<any> {
    const res = await apiClient.post(`/api/v1/admin/staff/leave/${leaveId}/reject`, {
      rejectionReason,
      version,
    });
    return res.data;
  },

  async cleanupExpiredInvitations(): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>(
      '/api/v1/admin/staff/cleanup-expired-invitations',
      {}
    );
    return res.data;
  },
};

// ─── ADMIN CUSTOMER SERVICE ───────────────────────────────────────────────────
export const adminCustomerService = {
  async searchCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    blacklisted?: boolean;
    tier?: string;
  }): Promise<{ data: CustomerProfileDto[]; meta?: any }> {
    const res = await apiClient.get<any>('/api/v1/admin/customers', { params });
    const raw = res.data;
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : [];
    return {
      data: items,
      meta: res.meta?.pagination ?? raw?.meta?.pagination ?? {
        total: items.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async getBlockedCustomers(params?: { page?: number; limit?: number; search?: string }) {
    const res = await apiClient.get<any>('/api/v1/admin/customers/blocked', {
      params,
    });
    const raw = res.data;
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : [];
    return {
      data: items,
      meta: res.meta?.pagination ?? raw?.meta?.pagination ?? {
        total: items.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async getArchivedCustomers(params?: { page?: number; limit?: number; search?: string }) {
    const res = await apiClient.get<any>('/api/v1/admin/customers/archived', {
      params,
    });
    const raw = res.data;
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : [];
    return {
      data: items,
      meta: res.meta?.pagination ?? raw?.meta?.pagination ?? {
        total: items.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },
};

// ─── ADMIN BOOKING SERVICE ────────────────────────────────────────────────────
export const adminBookingService = {
  async searchBookings(params?: {
    page?: number;
    limit?: number;
    salonId?: string;
    branchId?: string;
    customerId?: string;
    staffId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
  }): Promise<{ data: BookingDto[]; meta?: any }> {
    const res = await apiClient.get<any>('/api/v1/admin/bookings', { params });
    const raw = res.data;
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : [];
    return {
      data: items,
      meta: res.meta?.pagination ?? raw?.meta?.pagination ?? {
        total: items.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async getBookingStats(salonId?: string, branchId?: string) {
    const res = await apiClient.get<{ totalBookings: number }>('/api/v1/admin/bookings/statistics', {
      params: { salonId, branchId },
    });
    return res.data;
  },

  async cleanupExpiredLocks(): Promise<{ cleanedCount: number }> {
    const res = await apiClient.post<{ cleanedCount: number }>(
      '/api/v1/admin/bookings/cleanup-expired-locks',
      {}
    );
    return res.data;
  },
};

// ─── ADMIN PAYMENT SERVICE ────────────────────────────────────────────────────
export const adminPaymentService = {
  async searchPayments(params?: {
    page?: number;
    limit?: number;
    salonId?: string;
    branchId?: string;
    customerId?: string;
    status?: string;
    method?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{ data: PaymentDto[]; meta?: any }> {
    const res = await apiClient.get<any>('/api/v1/admin/payments', { params });
    const raw = res.data;
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : [];
    return {
      data: items,
      meta: res.meta?.pagination ?? raw?.meta?.pagination ?? {
        total: items.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async getFailedPayments(params?: { page?: number; limit?: number }) {
    const res = await apiClient.get<any>('/api/v1/admin/payments/failed', {
      params,
    });
    const raw = res.data;
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : [];
    return {
      data: items,
      meta: res.meta?.pagination ?? raw?.meta?.pagination ?? {
        total: items.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async getRefunds(paymentId?: string): Promise<RefundDto[]> {
    const res = await apiClient.get<RefundDto[]>('/api/v1/admin/payments/refunds', {
      params: paymentId ? { paymentId } : undefined,
    });
    return res.data ?? [];
  },

  async retryWebhook(webhookLogId: string): Promise<any> {
    const res = await apiClient.post<any>('/api/v1/admin/payments/webhooks/retry', {
      webhookLogId,
    });
    return res.data;
  },

  async getStatistics() {
    const res = await apiClient.get<{
      totalVolume: number;
      totalSuccessCount: number;
      totalFailedCount: number;
      totalRefundedAmount: number;
    }>('/api/v1/admin/payments/statistics');
    return res.data;
  },

  async cleanupLocks(): Promise<{ cleanedCount: number }> {
    const res = await apiClient.post<{ cleanedCount: number }>(
      '/api/v1/admin/payments/cleanup',
      {}
    );
    return res.data;
  },
};

// ─── ADMIN SERVICE CATALOG SERVICE ────────────────────────────────────────────
export const adminCatalogService = {
  async getCategories(): Promise<ServiceCategoryDto[]> {
    const res = await apiClient.get<any>('/api/v1/admin/services/categories');
    const raw = res.data;
    return Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : [];
  },

  async getServices(): Promise<ServiceDto[]> {
    const res = await apiClient.get<any>('/api/v1/admin/services');
    const raw = res.data;
    return Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : [];
  },

  async getBranchServices(branchId: string): Promise<any[]> {
    const res = await apiClient.get<any>('/api/v1/admin/services/branches/services', {
      params: { branchId },
    });
    const raw = res.data;
    return Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : [];
  },

  async createCategory(data: any): Promise<ServiceCategoryDto> {
    const res = await apiClient.post<ServiceCategoryDto>(
      API_ROUTES.SERVICE_CATALOG.CATEGORIES.CREATE,
      data
    );
    return res.data;
  },

  async updateCategory(id: string, data: any): Promise<ServiceCategoryDto> {
    const res = await apiClient.patch<ServiceCategoryDto>(
      API_ROUTES.SERVICE_CATALOG.CATEGORIES.UPDATE(id),
      data
    );
    return res.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(API_ROUTES.SERVICE_CATALOG.CATEGORIES.DELETE(id));
  },

  async createService(data: any): Promise<ServiceDto> {
    const res = await apiClient.post<ServiceDto>(
      API_ROUTES.SERVICE_CATALOG.SERVICES.CREATE,
      data
    );
    return res.data;
  },

  async updateService(id: string, data: any): Promise<ServiceDto> {
    const res = await apiClient.patch<ServiceDto>(
      API_ROUTES.SERVICE_CATALOG.SERVICES.UPDATE(id),
      data
    );
    return res.data;
  },

  async deleteService(id: string): Promise<void> {
    await apiClient.delete(API_ROUTES.SERVICE_CATALOG.SERVICES.DELETE(id));
  },
};

// ─── ADMIN INVENTORY SERVICE ──────────────────────────────────────────────────
export const adminInventoryService = {
  async getStatistics() {
    const res = await apiClient.get<any>('/api/v1/admin/inventory/statistics');
    return res.data;
  },

  async searchStock(params?: {
    page?: number;
    limit?: number;
    salonId?: string;
    branchId?: string;
    search?: string;
  }): Promise<{ data: BranchProductStockDto[]; meta?: any }> {
    const res = await apiClient.get<any>('/api/v1/admin/inventory/stock', {
      params,
    });
    const raw = res.data;
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : [];
    return {
      data: items,
      meta: res.meta?.pagination ?? raw?.meta?.pagination ?? {
        total: items.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async searchMovements(params?: {
    page?: number;
    limit?: number;
    branchId?: string;
    productId?: string;
    movementType?: string;
  }): Promise<{ data: StockMovementDto[]; meta?: any }> {
    const res = await apiClient.get<any>('/api/v1/admin/inventory/movements', {
      params,
    });
    const raw = res.data;
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : [];
    return {
      data: items,
      meta: res.meta?.pagination ?? raw?.meta?.pagination ?? {
        total: items.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async searchPurchaseOrders(params?: { salonId?: string; branchId?: string; status?: string }) {
    const res = await apiClient.get<any[]>('/api/v1/admin/inventory/purchase-orders', { params });
    return res.data ?? [];
  },

  async searchTransfers(params?: { page?: number; limit?: number }) {
    const res = await apiClient.get<any[]>('/api/v1/admin/inventory/transfers', { params });
    return {
      data: res.data ?? [],
      meta: res.meta?.pagination ?? {
        total: res.data?.length ?? 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async searchAudits(params?: { page?: number; limit?: number }) {
    const res = await apiClient.get<any[]>('/api/v1/admin/inventory/audits', { params });
    return {
      data: res.data ?? [],
      meta: res.meta?.pagination ?? {
        total: res.data?.length ?? 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },
};

// ─── ADMIN PROMOTIONS SERVICE ─────────────────────────────────────────────────
export const adminPromotionService = {
  async searchCoupons(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const res = await apiClient.get<any[]>('/api/v1/admin/promotions/coupons', { params });
    return {
      data: res.data ?? [],
      meta: res.meta?.pagination ?? {
        total: res.data?.length ?? 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async searchCouponUsages(params?: { page?: number; limit?: number; couponId?: string }) {
    const res = await apiClient.get<any[]>('/api/v1/admin/promotions/usages', { params });
    return {
      data: res.data ?? [],
      meta: res.meta?.pagination ?? {
        total: res.data?.length ?? 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async searchGiftCards(params?: { page?: number; limit?: number; search?: string }) {
    const res = await apiClient.get<any[]>('/api/v1/admin/promotions/gift-cards', { params });
    return {
      data: res.data ?? [],
      meta: res.meta?.pagination ?? {
        total: res.data?.length ?? 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async searchFlashSales(params?: { page?: number; limit?: number }) {
    const res = await apiClient.get<any[]>('/api/v1/admin/promotions/flash-sales', { params });
    return {
      data: res.data ?? [],
      meta: res.meta?.pagination ?? {
        total: res.data?.length ?? 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async searchCampaigns(params?: { page?: number; limit?: number }) {
    const res = await apiClient.get<any[]>('/api/v1/admin/promotions/campaigns', { params });
    return {
      data: res.data ?? [],
      meta: res.meta?.pagination ?? {
        total: res.data?.length ?? 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },
};

// ─── ADMIN REVIEW MODERATION SERVICE ──────────────────────────────────────────
export const adminReviewService = {
  async getModerationReviews(params?: { page?: number; limit?: number; status?: string }) {
    const res = await apiClient.get<any[]>('/api/v1/admin/reviews/moderation', { params });
    return {
      data: res.data ?? [],
      meta: res.meta?.pagination ?? {
        total: res.data?.length ?? 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async hideReview(id: string, reason: string) {
    const res = await apiClient.post(`/api/v1/admin/reviews/moderation/${id}/hide`, { reason });
    return res.data;
  },

  async publishReview(id: string) {
    const res = await apiClient.post(`/api/v1/admin/reviews/moderation/${id}/publish`, {});
    return res.data;
  },

  async rejectReview(id: string, reason: string) {
    const res = await apiClient.post(`/api/v1/admin/reviews/moderation/${id}/reject`, { reason });
    return res.data;
  },

  async getFlags(params?: { page?: number; limit?: number }) {
    const res = await apiClient.get<any[]>('/api/v1/admin/reviews/flags', { params });
    return {
      data: res.data ?? [],
      meta: res.meta?.pagination ?? {
        total: res.data?.length ?? 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async resolveFlag(
    flagId: string,
    status: string,
    resolutionNotes: string,
    actionOnReview?: string
  ) {
    const res = await apiClient.post(`/api/v1/admin/reviews/flags/${flagId}/resolve`, {
      status,
      resolutionNotes,
      actionOnReview,
    });
    return res.data;
  },

  async getDisputes(params?: { page?: number; limit?: number }) {
    const res = await apiClient.get<any[]>('/api/v1/admin/reviews/disputes', { params });
    return {
      data: res.data ?? [],
      meta: res.meta?.pagination ?? {
        total: res.data?.length ?? 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async resolveDispute(
    disputeId: string,
    status: string,
    adminDecisionNotes: string,
    version: number = 1
  ) {
    const res = await apiClient.post(`/api/v1/admin/reviews/disputes/${disputeId}/resolve`, {
      status,
      adminDecisionNotes,
      version,
    });
    return res.data;
  },
};

// ─── ADMIN NOTIFICATION SERVICE ───────────────────────────────────────────────
export const adminNotificationService = {
  async getTemplates(params?: { page?: number; limit?: number }) {
    const res = await apiClient.get<any[]>('/api/v1/admin/notifications/templates', { params });
    return {
      data: res.data ?? [],
      meta: res.meta?.pagination ?? {
        total: res.data?.length ?? 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async createTemplate(data: any) {
    const res = await apiClient.post('/api/v1/admin/notifications/templates', data);
    return res.data;
  },

  async updateTemplate(id: string, data: any) {
    const res = await apiClient.patch(`/api/v1/admin/notifications/templates/${id}`, data);
    return res.data;
  },

  async activateTemplate(id: string) {
    const res = await apiClient.patch(`/api/v1/admin/notifications/templates/${id}/activate`, {});
    return res.data;
  },

  async deactivateTemplate(id: string) {
    const res = await apiClient.patch(`/api/v1/admin/notifications/templates/${id}/deactivate`, {});
    return res.data;
  },

  async deleteTemplate(id: string) {
    const res = await apiClient.delete(`/api/v1/admin/notifications/templates/${id}`);
    return res.data;
  },

  async previewTemplate(id: string, sampleVariables: Record<string, any>) {
    const res = await apiClient.post(`/api/v1/admin/notifications/templates/${id}/preview`, {
      sampleVariables,
    });
    return res.data;
  },

  async sendNotification(data: any) {
    const res = await apiClient.post('/api/v1/admin/notifications/send', data);
    return res.data;
  },

  async broadcastNotification(data: {
    userIds: string[];
    templateCode?: string;
    channels?: string[];
    title?: string;
    body?: string;
    templateVariables?: Record<string, any>;
    priority?: string;
    category?: string;
  }) {
    const res = await apiClient.post('/api/v1/admin/notifications/broadcast', data);
    return res.data;
  },
};

// ─── ADMIN MEDIA SERVICE ──────────────────────────────────────────────────────
export const adminMediaService = {
  async searchMedia(params?: {
    page?: number;
    limit?: number;
    salonId?: string;
    category?: string;
    status?: string;
    includeDeleted?: boolean;
    search?: string;
  }): Promise<{ data: FileAssetDto[]; meta?: any }> {
    const res = await apiClient.get<FileAssetDto[]>('/api/v1/admin/media', { params });
    return {
      data: res.data ?? [],
      meta: res.meta?.pagination ?? {
        total: res.data?.length ?? 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async inspectMedia(id: string): Promise<FileAssetDto> {
    const res = await apiClient.get<FileAssetDto>(`/api/v1/admin/media/${id}`);
    return res.data;
  },

  async deleteMedia(id: string): Promise<FileAssetDto> {
    const res = await apiClient.delete<FileAssetDto>(`/api/v1/admin/media/${id}`);
    return res.data;
  },

  async restoreMedia(id: string): Promise<FileAssetDto> {
    const res = await apiClient.post<FileAssetDto>(`/api/v1/admin/media/${id}/restore`, {});
    return res.data;
  },
};

// ─── ADMIN HEALTH & TELEMETRY SERVICE ─────────────────────────────────────────
export const adminHealthService = {
  async getHealth() {
    const res = await apiClient.get<any>(API_ROUTES.HEALTH.HEALTH);
    return res.data;
  },

  async getReadiness() {
    const res = await apiClient.get<any>(API_ROUTES.HEALTH.READINESS);
    return res.data;
  },

  async getLiveness() {
    const res = await apiClient.get<any>(API_ROUTES.HEALTH.LIVENESS);
    return res.data;
  },
};
