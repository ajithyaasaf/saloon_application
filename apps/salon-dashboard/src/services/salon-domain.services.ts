import { API_ROUTES } from '@saloon/config';
import {
  AuthResponseDto,
  BookingDto,
  BookingStatus,
  BranchClosureDto,
  BranchDto,
  BranchOperatingHourDto,
  BranchProductStockDto,
  ConfigureBranchServiceRequestDto,
  ConfigureStaffShiftsRequestDto,
  CouponDto,
  CreateBranchClosureDto,
  CreateBranchRequestDto,
  CreateServiceCategoryRequestDto,
  CreateServiceRequestDto,
  CreateStaffRequestDto,
  FileAssetDto,
  FileCategory,
  FileVisibility,
  FlashSaleDto,
  InitiatePresignedUploadRequestDto,
  InitiatePresignedUploadResponseDto,
  PasswordLoginRequestDto,
  ProductDto,
  PurchaseOrderDto,
  ReviewDto,
  ReviewReplyDto,
  SalonDto,
  SalonReputationDto,
  ServiceCategoryDto,
  ServiceDto,
  StaffLeaveDto,
  StaffMemberDto,
  UserProfileDto,
} from '@saloon/shared-types';
import { apiClient, tokenStorage } from './api.service.js';

export const authService = {
  async login(payload: PasswordLoginRequestDto): Promise<AuthResponseDto> {
    const res = await apiClient.post<AuthResponseDto>(API_ROUTES.AUTH.LOGIN_PASSWORD, payload, { skipAuth: true });
    const data = res.data as any;
    const accessToken = data?.tokens?.accessToken || data?.accessToken;
    const refreshToken = data?.tokens?.refreshToken || data?.refreshToken;

    if (accessToken) {
      await tokenStorage.setAccessToken(accessToken);
    }
    if (refreshToken) {
      await tokenStorage.setRefreshToken(refreshToken);
    }
    if (typeof window !== 'undefined' && data?.user) {
      localStorage.setItem('saloon_user_session', JSON.stringify(data.user));
    }
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ROUTES.AUTH.LOGOUT, {});
    } catch {
      // Best-effort logout
    } finally {
      await tokenStorage.clearTokens();
    }
  },

  async getMe(): Promise<UserProfileDto> {
    const res = await apiClient.get<UserProfileDto>(API_ROUTES.USERS.ME);
    return res.data;
  },
};

export const salonService = {
  async getSalon(id: string): Promise<SalonDto> {
    const res = await apiClient.get<SalonDto>(API_ROUTES.SALONS.GET(id));
    return res.data;
  },

  async getBranches(salonId: string): Promise<BranchDto[]> {
    const res = await apiClient.get<BranchDto[]>(API_ROUTES.SALONS.BRANCHES.LIST(salonId));
    return res.data;
  },

  async createBranch(salonId: string, data: CreateBranchRequestDto): Promise<BranchDto> {
    const res = await apiClient.post<BranchDto>(API_ROUTES.SALONS.BRANCHES.CREATE(salonId), data);
    return res.data;
  },

  async updateOperatingHours(
    salonId: string,
    branchId: string,
    operatingHours: BranchOperatingHourDto[],
  ): Promise<BranchOperatingHourDto[]> {
    const res = await apiClient.put<BranchOperatingHourDto[]>(
      API_ROUTES.SALONS.BRANCHES.OPERATING_HOURS(salonId, branchId),
      { operatingHours },
    );
    return res.data;
  },

  async createClosure(
    salonId: string,
    branchId: string,
    closure: CreateBranchClosureDto,
  ): Promise<BranchClosureDto> {
    const res = await apiClient.post<BranchClosureDto>(
      API_ROUTES.SALONS.BRANCHES.CLOSURES(salonId, branchId),
      closure,
    );
    return res.data;
  },
};

export const bookingService = {
  async getBranchBookings(branchId: string, date?: string): Promise<BookingDto[]> {
    const res = await apiClient.get<BookingDto[]>(API_ROUTES.BOOKING.BRANCH_BOOKINGS(branchId), {
      params: date ? { date } : undefined,
    });
    return res.data;
  },

  async updateBookingStatus(id: string, status: BookingStatus, notes?: string): Promise<BookingDto> {
    const res = await apiClient.patch<BookingDto>(API_ROUTES.BOOKING.UPDATE_STATUS(id), { status, notes });
    return res.data;
  },

  async cancelBooking(id: string, reason: string): Promise<BookingDto> {
    const res = await apiClient.post<BookingDto>(API_ROUTES.BOOKING.CANCEL(id), { reason });
    return res.data;
  },
};

export const catalogService = {
  async getCategories(): Promise<ServiceCategoryDto[]> {
    const res = await apiClient.get<ServiceCategoryDto[]>(API_ROUTES.SERVICE_CATALOG.CATEGORIES.LIST);
    return res.data;
  },

  async createCategory(data: CreateServiceCategoryRequestDto): Promise<ServiceCategoryDto> {
    const res = await apiClient.post<ServiceCategoryDto>(API_ROUTES.SERVICE_CATALOG.CATEGORIES.CREATE, data);
    return res.data;
  },

  async getServices(params?: { categoryId?: string; salonId?: string }): Promise<ServiceDto[]> {
    const res = await apiClient.get<ServiceDto[]>(API_ROUTES.SERVICE_CATALOG.SERVICES.LIST, { params });
    return res.data;
  },

  async createService(data: CreateServiceRequestDto): Promise<ServiceDto> {
    const res = await apiClient.post<ServiceDto>(API_ROUTES.SERVICE_CATALOG.SERVICES.CREATE, data);
    return res.data;
  },

  async updateService(id: string, data: Partial<CreateServiceRequestDto> & { isActive?: boolean }): Promise<ServiceDto> {
    const res = await apiClient.patch<ServiceDto>(API_ROUTES.SERVICE_CATALOG.SERVICES.UPDATE(id), data);
    return res.data;
  },

  async deleteService(id: string): Promise<void> {
    await apiClient.delete(API_ROUTES.SERVICE_CATALOG.SERVICES.DELETE(id));
  },

  async configureBranchPricing(
    branchId: string,
    serviceId: string,
    data: ConfigureBranchServiceRequestDto,
  ): Promise<any> {
    const res = await apiClient.put(
      API_ROUTES.SERVICE_CATALOG.SERVICES.BRANCH_PRICING(branchId, serviceId),
      data,
    );
    return res.data;
  },
};

export const staffService = {
  async getStaffMembers(salonId?: string): Promise<StaffMemberDto[]> {
    const res = await apiClient.get<StaffMemberDto[]>(API_ROUTES.STAFF.LIST, {
      params: salonId ? { salonId } : undefined,
    });
    return res.data;
  },

  async createStaff(data: CreateStaffRequestDto): Promise<StaffMemberDto> {
    const res = await apiClient.post<StaffMemberDto>(API_ROUTES.STAFF.CREATE, data);
    return res.data;
  },

  async configureShifts(staffId: string, data: ConfigureStaffShiftsRequestDto): Promise<any> {
    const res = await apiClient.put(API_ROUTES.STAFF.SHIFTS(staffId), data);
    return res.data;
  },

  async getLeaves(staffId: string): Promise<StaffLeaveDto[]> {
    const res = await apiClient.get<StaffLeaveDto[]>(API_ROUTES.STAFF.LEAVES.LIST(staffId));
    return res.data;
  },
};

export const inventoryService = {
  async getProducts(salonId?: string): Promise<ProductDto[]> {
    const res = await apiClient.get<ProductDto[]>(API_ROUTES.INVENTORY.PRODUCTS.LIST, {
      params: salonId ? { salonId } : undefined,
    });
    return res.data;
  },

  async createProduct(data: any): Promise<ProductDto> {
    const res = await apiClient.post<ProductDto>(API_ROUTES.INVENTORY.PRODUCTS.CREATE, data);
    return res.data;
  },

  async updateProduct(id: string, data: any): Promise<ProductDto> {
    const res = await apiClient.patch<ProductDto>(API_ROUTES.INVENTORY.PRODUCTS.UPDATE(id), data);
    return res.data;
  },

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(API_ROUTES.INVENTORY.PRODUCTS.DELETE(id));
  },

  async getBranchStock(branchId: string): Promise<BranchProductStockDto[]> {
    const res = await apiClient.get<BranchProductStockDto[]>(API_ROUTES.INVENTORY.STOCK.BRANCH(branchId));
    return res.data;
  },

  async getPurchaseOrders(salonId?: string): Promise<PurchaseOrderDto[]> {
    const res = await apiClient.get<PurchaseOrderDto[]>(API_ROUTES.INVENTORY.PURCHASE_ORDERS.LIST, {
      params: salonId ? { salonId } : undefined,
    });
    return res.data;
  },
};

export const promotionsService = {
  async getCoupons(salonId?: string): Promise<CouponDto[]> {
    const res = await apiClient.get<CouponDto[]>(API_ROUTES.PROMOTIONS.COUPONS.LIST, {
      params: salonId ? { salonId } : undefined,
    });
    return res.data;
  },

  async createCoupon(data: any): Promise<CouponDto> {
    const res = await apiClient.post<CouponDto>(API_ROUTES.PROMOTIONS.COUPONS.CREATE, data);
    return res.data;
  },

  async getFlashSales(salonId?: string): Promise<FlashSaleDto[]> {
    const res = await apiClient.get<FlashSaleDto[]>(API_ROUTES.PROMOTIONS.FLASH_SALES.LIST, {
      params: salonId ? { salonId } : undefined,
    });
    return res.data;
  },
};

export const customerService = {
  async getBranchReviews(branchId: string): Promise<ReviewDto[]> {
    const res = await apiClient.get<ReviewDto[]>(API_ROUTES.REVIEWS.LIST_FOR_BRANCH(branchId));
    return res.data;
  },

  async replyToReview(reviewId: string, comment: string): Promise<ReviewReplyDto> {
    const res = await apiClient.post<ReviewReplyDto>(API_ROUTES.REVIEWS.REPLY(reviewId), { comment });
    return res.data;
  },
};

export const mediaService = {
  async uploadFile(
    file: File,
    category: FileCategory,
    salonId?: string,
    visibility: FileVisibility = FileVisibility.PUBLIC,
  ): Promise<FileAssetDto> {
    // 1. Request presigned upload URL from Phase 20 media engine
    const presignedReq: InitiatePresignedUploadRequestDto = {
      category,
      fileName: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
      salonId,
      visibility,
    };

    const presignedRes = await apiClient.post<InitiatePresignedUploadResponseDto>(
      API_ROUTES.MEDIA.PRESIGNED_UPLOAD,
      presignedReq,
    );

    const { uploadUrl, assetId, httpMethod, requiredHeaders } = presignedRes.data;

    // 2. Direct upload to cloud storage via PUT/POST
    const uploadHeaders: Record<string, string> = {
      'Content-Type': file.type,
      ...(requiredHeaders || {}),
    };

    const directUploadRes = await fetch(uploadUrl, {
      method: httpMethod || 'PUT',
      headers: uploadHeaders,
      body: file,
    });

    if (!directUploadRes.ok) {
      throw new Error(`Direct cloud upload failed with status ${directUploadRes.status}`);
    }

    // 3. Finalize upload handshake
    const finalizeRes = await apiClient.post<any>(API_ROUTES.MEDIA.FINALIZE_UPLOAD(assetId), {
      actualSizeBytes: file.size,
    });

    return finalizeRes.data.asset || finalizeRes.data;
  },
};
