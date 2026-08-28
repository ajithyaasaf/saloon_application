import { BookingStatus } from '@prisma/client';

/**
 * BookingItemEntity — Pure TypeScript Domain Entity for Booking Line Item.
 * No NestJS, No Prisma, No database coupling.
 */
export class BookingItemEntity {
  id: string;
  bookingId: string;
  branchServiceId: string;
  staffId: string;
  sequenceOrder: number;
  startTime: Date;
  endTime: Date;
  serviceDurationMinutes: number;
  prepTimeMinutes: number;
  cleanupTimeMinutes: number;
  bufferTimeMinutes: number;
  unitPrice: number;
  discountAmount: number;
  finalPrice: number;
  status: BookingStatus;
  version: number;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<BookingItemEntity>) {
    Object.assign(this, partial);
  }

  public duration(): number {
    return (
      this.serviceDurationMinutes +
      this.prepTimeMinutes +
      this.cleanupTimeMinutes +
      this.bufferTimeMinutes
    );
  }

  public overlaps(start: Date, end: Date): boolean {
    return this.startTime.getTime() < end.getTime() && start.getTime() < this.endTime.getTime();
  }
}
