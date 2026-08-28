import { FlashSaleStatus } from '@prisma/client';

export interface CreateFlashSaleData {
  salonId: string;
  branchId: string;
  serviceId: string;
  title: string;
  discountPercentage: number | string;
  specialPrice: number;
  startTime: Date;
  endTime: Date;
  maxSlotQuota: number;
  bookedSlotCount?: number;
  status?: FlashSaleStatus;
}

export interface UpdateFlashSaleData {
  title?: string;
  discountPercentage?: number | string;
  specialPrice?: number;
  startTime?: Date;
  endTime?: Date;
  maxSlotQuota?: number;
  status?: FlashSaleStatus;
}

export interface SearchFlashSaleQueryDto {
  salonId?: string;
  branchId?: string;
  serviceId?: string;
  status?: FlashSaleStatus;
  isActiveNow?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'startTime' | 'endTime' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
