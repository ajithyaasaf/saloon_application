import { NotificationResult, SendNotificationDto } from '../dto/send-notification.dto';

/**
 * INotificationService — Provider-agnostic public interface for multi-channel notification dispatching.
 *
 * Architecture ref: Phase 9.2 §4.6
 */
export interface INotificationService {
  send(notification: SendNotificationDto): Promise<NotificationResult>;
  sendBulk(notifications: SendNotificationDto[]): Promise<NotificationResult[]>;
  renderTemplate(templateId: string, variables: Record<string, unknown>): Promise<{ subject?: string; body: string }>;
}
