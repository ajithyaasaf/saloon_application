import { FlashSaleStatus } from '@prisma/client';

export class PublicFlashSaleResponseDto {
  id: string;
  salonId: string;
  branchId: string;
  serviceId: string;
  title: string;
  discountPercentage: number;
  specialPrice: number;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  remainingSlots: number;
}

export class OwnerFlashSaleResponseDto extends PublicFlashSaleResponseDto {
  maxSlotQuota: number;
  bookedSlotCount: number;
  status: FlashSaleStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
