import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuditModule } from '../../shared/audit/audit.module';
import { SharedCacheModule } from '../../shared/cache/cache.module';
import { EventsModule } from '../../shared/events/events.module';
import { SharedNotificationModule } from '../../shared/notification/notification.module';
import { TransactionModule } from '../../shared/transaction/transaction.module';

import { NotificationDeliveryRepository } from './repositories/notification-delivery.repository';
import { NotificationTemplateRepository } from './repositories/notification-template.repository';
import { NotificationRepository } from './repositories/notification.repository';
import { UserNotificationPreferenceRepository } from './repositories/user-notification-preference.repository';

import { NotificationDispatchService } from './services/notification-dispatch.service';
import { NotificationInboxService } from './services/notification-inbox.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationTemplateService } from './services/notification-template.service';

import { NotificationAdminController } from './controllers/notification-admin.controller';
import { NotificationCustomerController } from './controllers/notification-customer.controller';
import { NotificationOwnerController } from './controllers/notification-owner.controller';
import { NotificationPreferenceController } from './controllers/notification-preference.controller';

const REPOSITORIES = [
  NotificationTemplateRepository,
  NotificationRepository,
  NotificationDeliveryRepository,
  UserNotificationPreferenceRepository,
];

const SERVICES = [
  NotificationTemplateService,
  NotificationPreferenceService,
  NotificationDispatchService,
  NotificationInboxService,
];

const CONTROLLERS = [
  NotificationAdminController,
  NotificationOwnerController,
  NotificationCustomerController,
  NotificationPreferenceController,
];

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    SharedCacheModule,
    EventsModule,
    TransactionModule,
    SharedNotificationModule,
  ],
  controllers: CONTROLLERS,
  providers: [...REPOSITORIES, ...SERVICES],
  exports: [...REPOSITORIES, ...SERVICES],
})
export class NotificationsModule {}
