import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { SharedCacheModule } from './cache/cache.module';
import { EventsModule } from './events/events.module';
import { SharedQueueModule } from './queue/queue.module';
import { SharedStorageModule } from './storage/storage.module';
import { SharedNotificationModule } from './notification/notification.module';
import { TransactionModule } from './transaction/transaction.module';

/**
 * SharedModule — Root aggregation module for all 7 Phase 9.2 Shared Services.
 *
 * Exports:
 *  1. TransactionModule  (Prisma Interactive Transaction Runner)
 *  2. AuditModule        (Immutable Audit Log Service)
 *  3. SharedCacheModule  (Multi-tier Cache-Aside Redis Service)
 *  4. SharedQueueModule  (Provider-Agnostic Background Job Queue Service)
 *  5. EventsModule       (Domain Event Engine with Versioning)
 *  6. SharedStorageModule (Cloud Storage Provider Service)
 *  7. SharedNotificationModule (Multi-Channel Notification Dispatcher)
 *
 * Architecture ref: Phase 9.2 Architecture
 */
@Module({
  imports: [
    TransactionModule,
    AuditModule,
    SharedCacheModule,
    SharedQueueModule,
    EventsModule,
    SharedStorageModule,
    SharedNotificationModule,
  ],
  exports: [
    TransactionModule,
    AuditModule,
    SharedCacheModule,
    SharedQueueModule,
    EventsModule,
    SharedStorageModule,
    SharedNotificationModule,
  ],
})
export class SharedModule {}
