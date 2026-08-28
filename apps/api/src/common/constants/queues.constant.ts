/**
 * Queue name constants.
 * These must be used everywhere queues are registered or dispatched to.
 * Never use raw strings for queue names.
 *
 * Architecture ref: Phase 5 §10.1
 */
export const QUEUE_NOTIFICATION_PUSH = 'notification.push' as const;
export const QUEUE_NOTIFICATION_SMS = 'notification.sms' as const;
export const QUEUE_NOTIFICATION_WHATSAPP = 'notification.whatsapp' as const;
export const QUEUE_NOTIFICATION_EMAIL = 'notification.email' as const;
export const QUEUE_MEDIA_PROCESSING = 'media.processing' as const;
export const QUEUE_CLEANUP_JOBS = 'cleanup.jobs' as const;

export type QueueName =
  | typeof QUEUE_NOTIFICATION_PUSH
  | typeof QUEUE_NOTIFICATION_SMS
  | typeof QUEUE_NOTIFICATION_WHATSAPP
  | typeof QUEUE_NOTIFICATION_EMAIL
  | typeof QUEUE_MEDIA_PROCESSING
  | typeof QUEUE_CLEANUP_JOBS;

export const ALL_QUEUES: QueueName[] = [
  QUEUE_NOTIFICATION_PUSH,
  QUEUE_NOTIFICATION_SMS,
  QUEUE_NOTIFICATION_WHATSAPP,
  QUEUE_NOTIFICATION_EMAIL,
  QUEUE_MEDIA_PROCESSING,
  QUEUE_CLEANUP_JOBS,
];
