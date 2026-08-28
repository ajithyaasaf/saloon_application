import { NotificationChannel, NotificationDelivery, NotificationStatus } from '@prisma/client';

export class NotificationDeliveryEntity {
  static readonly MAX_RETRIES = 3;

  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  providerMessageId?: string | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  failedReason?: string | null;
  externalMetadata?: Record<string, unknown> | null;
  retryCount: number;
  nextRetryAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<NotificationDelivery> | any) {
    Object.assign(this, partial);
    this.retryCount = partial?.retryCount ?? 0;
  }

  public canRetry(): boolean {
    return this.retryCount < NotificationDeliveryEntity.MAX_RETRIES;
  }

  public calculateNextRetryDelayMs(): number {
    switch (this.retryCount) {
      case 0:
        return 60 * 1000; // 1 minute
      case 1:
        return 5 * 60 * 1000; // 5 minutes
      case 2:
        return 30 * 60 * 1000; // 30 minutes
      default:
        return 60 * 60 * 1000; // 1 hour
    }
  }

  public markSent(providerMessageId?: string, date = new Date()): void {
    this.status = NotificationStatus.SENT;
    this.sentAt = date;
    if (providerMessageId) {
      this.providerMessageId = providerMessageId;
    }
  }

  public markDelivered(date = new Date()): void {
    this.status = NotificationStatus.DELIVERED;
    this.deliveredAt = date;
  }

  public markFailed(reason: string): void {
    this.status = NotificationStatus.FAILED;
    this.failedReason = reason;
  }

  public scheduleRetry(nextRetryAt: Date): void {
    this.status = NotificationStatus.FAILED;
    this.nextRetryAt = nextRetryAt;
    this.retryCount += 1;
  }
}
