/**
 * NotificationChannel — Strongly-typed notification delivery channels.
 *
 * Architecture ref: Phase 9.2 §4.6
 */
export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'WHATSAPP' | 'IN_APP';

/**
 * SendNotificationDto — Data transfer object for dispatching multi-channel notifications.
 */
export interface SendNotificationDto {
  recipient: string; // e.g. email address, phone number, device token, or userId
  channel: NotificationChannel;
  templateId: string;
  templateVariables?: Record<string, unknown>;
  subject?: string;
  body?: string;
  scheduledAt?: Date;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

/**
 * NotificationResult — Return payload upon enqueuing notification.
 */
export interface NotificationResult {
  jobId: string;
  channel: NotificationChannel;
  status: 'QUEUED' | 'SCHEDULED';
  queuedAt: string;
}
