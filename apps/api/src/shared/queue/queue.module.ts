import { Module } from '@nestjs/common';
import { QueueModule as InfraQueueModule } from '../../infrastructure/queue/queue.module';
import { QueueService } from './queue.service';

/**
 * SharedQueueModule — Exports QueueService for background job dispatches across domain services.
 */
@Module({
  imports: [InfraQueueModule],
  providers: [QueueService],
  exports: [QueueService],
})
export class SharedQueueModule {}
