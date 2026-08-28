import { NotificationChannel, ReviewInvitationStatus } from '@prisma/client';

export class ReviewInvitationEntity {
  id: string;
  bookingId: string;
  salonId: string;
  branchId: string;
  customerId: string;
  channel: NotificationChannel;
  invitationToken: string;
  status: ReviewInvitationStatus;
  sentAt?: Date | null;
  expiresAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ReviewInvitationEntity>) {
    Object.assign(this, partial);
  }

  public isExpired(): boolean {
    return new Date() > this.expiresAt || this.status === ReviewInvitationStatus.EXPIRED;
  }

  public isRedeemable(): boolean {
    return (
      (this.status === ReviewInvitationStatus.PENDING ||
        this.status === ReviewInvitationStatus.SENT ||
        this.status === ReviewInvitationStatus.OPENED) &&
      !this.isExpired()
    );
  }
}
