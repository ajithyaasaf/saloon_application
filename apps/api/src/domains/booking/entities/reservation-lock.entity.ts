/**
 * ReservationLockEntity — Pure TypeScript Domain Entity for Ephemeral Slot Lock.
 * No NestJS, No Prisma, No database coupling.
 */
export class ReservationLockEntity {
  id: string;
  lockKey: string;
  branchId: string;
  staffId: string;
  customerId: string;
  sessionId?: string | null;
  bookingId?: string | null;
  startTime: Date;
  endTime: Date;
  expiresAt: Date;
  refreshCount: number;
  isReleased: boolean;
  createdAt: Date;

  constructor(partial: Partial<ReservationLockEntity>) {
    Object.assign(this, partial);
  }

  public isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() < now.getTime();
  }

  public checkIsReleased(): boolean {
    return this.isReleased;
  }

  public canAcquire(now: Date = new Date()): boolean {
    return !this.isReleased && !this.isExpired(now);
  }
}
