import { Module } from '@nestjs/common';
import { SharedQueueModule } from '../queue/queue.module';
import { NotificationService } from './notification.service';

/**
 * SharedNotificationModule — Exports NotificationService for multi-channel message dispatches across domains.
 */
@Module({
  imports: [SharedQueueModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class SharedNotificationModule {}
