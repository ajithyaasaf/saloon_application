import { Module } from '@nestjs/common';
import { SharedQueueModule } from '../queue/queue.module';
import { EventBusService } from './event-bus.service';

/**
 * EventsModule — Exports EventBusService for domain event publishing & subscriptions across modules.
 */
@Module({
  imports: [SharedQueueModule],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventsModule {}
