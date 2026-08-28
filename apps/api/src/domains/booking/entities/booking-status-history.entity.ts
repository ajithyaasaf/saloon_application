import { BookingStatus } from '@prisma/client';

/**
 * BookingStatusHistoryEntity — Pure TypeScript Domain Entity for Immutable Status Transition Log.
 * No NestJS, No Prisma, No database coupling.
 */
export class BookingStatusHistoryEntity {
  id: string;
  bookingId: string;
  fromStatus?: BookingStatus | null;
  toStatus: BookingStatus;
  reason?: string | null;
  performedByUserId: string;
  actorRole: string;
  metadata?: Record<string, any> | null;
  createdAt: Date;

  constructor(partial: Partial<BookingStatusHistoryEntity>) {
    Object.assign(this, partial);
  }

  public transition(): { from?: BookingStatus | null; to: BookingStatus } {
    return {
      from: this.fromStatus,
      to: this.toStatus,
    };
  }
}
