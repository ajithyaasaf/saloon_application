import { FlashSaleStatus } from '@prisma/client';

export class FlashSaleEntity {
  id: string;
  salonId: string;
  branchId: string;
  serviceId: string;
  title: string;
  discountPercentage: number;
  specialPrice: number;
  startTime: Date;
  endTime: Date;
  maxSlotQuota: number;
  bookedSlotCount: number;
  status: FlashSaleStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: any) {
    Object.assign(this, partial);
    if (partial?.discountPercentage !== undefined && partial?.discountPercentage !== null) {
      this.discountPercentage = Number(partial.discountPercentage);
    }
  }

  public isAvailable(checkTime = new Date()): boolean {
    if (this.deletedAt || this.status !== FlashSaleStatus.ACTIVE) return false;
    if (checkTime < this.startTime || checkTime > this.endTime) return false;
    return this.bookedSlotCount < this.maxSlotQuota;
  }

  public remainingSlots(): number {
    return Math.max(0, this.maxSlotQuota - this.bookedSlotCount);
  }
}
