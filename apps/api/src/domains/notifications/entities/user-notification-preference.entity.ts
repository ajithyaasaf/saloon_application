import { NotificationChannel, NotificationPriority, UserNotificationPreference } from '@prisma/client';

export class UserNotificationPreferenceEntity {
  id: string;
  userId: string;
  channel: NotificationChannel;
  isEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserNotificationPreference> | any) {
    Object.assign(this, partial);
    this.isEnabled = partial?.isEnabled ?? true;
    this.quietHoursEnabled = partial?.quietHoursEnabled ?? false;
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
  }

  public toggle(): void {
    this.isEnabled = !this.isEnabled;
  }

  public enableQuietHours(start: string, end: string): void {
    this.quietHoursEnabled = true;
    this.quietHoursStart = start;
    this.quietHoursEnd = end;
  }

  public disableQuietHours(): void {
    this.quietHoursEnabled = false;
  }

  public isWithinQuietHours(now = new Date()): boolean {
    if (!this.quietHoursEnabled || !this.quietHoursStart || !this.quietHoursEnd) {
      return false;
    }

    const currentHours = now.getUTCHours();
    const currentMinutes = now.getUTCMinutes();
    const currentSeconds = now.getUTCSeconds();
    const currentTotalSec = currentHours * 3600 + currentMinutes * 60 + currentSeconds;

    const parseTimeToSec = (timeStr: string): number => {
      const parts = timeStr.split(':').map((p) => parseInt(p, 10) || 0);
      return parts[0] * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    };

    const startSec = parseTimeToSec(this.quietHoursStart);
    const endSec = parseTimeToSec(this.quietHoursEnd);

    if (startSec > endSec) {
      // Midnight-crossing quiet period, e.g. 22:00 -> 08:00
      return currentTotalSec >= startSec || currentTotalSec < endSec;
    } else {
      // Same-day quiet period, e.g. 13:00 -> 15:00
      return currentTotalSec >= startSec && currentTotalSec < endSec;
    }
  }

  public canReceiveNotification(
    priority: NotificationPriority = NotificationPriority.NORMAL,
    now = new Date(),
  ): boolean {
    if (!this.isEnabled) {
      return false;
    }

    // CRITICAL priority notifications strictly bypass quiet hours
    if (priority === NotificationPriority.CRITICAL) {
      return true;
    }

    if (this.quietHoursEnabled && this.isWithinQuietHours(now)) {
      return false;
    }

    return true;
  }
}
