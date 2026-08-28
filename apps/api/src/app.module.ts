import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Config
import { configValidationSchema } from './config/config.validation';
import {
  appConfig,
  databaseConfig,
  redisConfig,
  bullmqConfig,
  jwtConfig,
  cloudinaryConfig,
  razorpayConfig,
  firebaseConfig,
  twilioConfig,
  platformConfig,
  storageConfig,
} from './config/configs';

// Infrastructure Modules
import { LoggerModule } from './infrastructure/logger/logger.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { StorageModule } from './infrastructure/storage/storage.module';

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageModule, ThrottlerStorageRedisService } from './common/throttler';

// Common Layer
import { JwtAuthGuard, RolesGuard } from './common/guards/auth.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TrimStringsPipe } from './common/pipes/trim-strings.pipe';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

// Domain Modules
import { AuthModule } from './domains/auth/auth.module';
import { UsersModule } from './domains/users/users.module';
import { SalonModule } from './domains/salon/salon.module';
import { ServiceCatalogModule } from './domains/service-catalog/service-catalog.module';
import { BookingModule } from './domains/booking/booking.module';
import { StaffModule } from './domains/staff/staff.module';
import { PaymentModule } from './domains/payment/payment.module';
import { CustomerModule } from './domains/customer/customer.module';
import { InventoryModule } from './domains/inventory/inventory.module';
import { ReviewsModule } from './domains/reviews/reviews.module';
import { PromotionsModule } from './domains/promotions/promotions.module';
import { NotificationsModule } from './domains/notifications/notifications.module';
import { MediaModule } from './domains/media/media.module';
import { AppConfigModule } from './domains/app-config/app-config.module';

// Health & Root
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Configuration Module (Global)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test'
          ? ['.env.test']
          : ['.env', 'apps/api/.env', '../apps/api/.env', '../../apps/api/.env'],
      validationSchema: configValidationSchema,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        bullmqConfig,
        jwtConfig,
        cloudinaryConfig,
        razorpayConfig,
        firebaseConfig,
        twilioConfig,
        platformConfig,
        storageConfig,
      ],
    }),

    // Global Event Emitter
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
    }),

    // Rate Limiting Throttler Module
    ThrottlerStorageModule,
    ThrottlerModule.forRootAsync({
      imports: [ThrottlerStorageModule],
      inject: [ThrottlerStorageRedisService],
      useFactory: (storage: ThrottlerStorageRedisService) => ({
        storage,
        throttlers: [
          {
            name: 'default',
            ttl: 60000,
            limit: 60,
          },
          {
            name: 'otp',
            ttl: 60000,
            limit: 5,
          },
          {
            name: 'login',
            ttl: 60000,
            limit: 10,
          },
          {
            name: 'booking',
            ttl: 60000,
            limit: 15,
          },
          {
            name: 'search',
            ttl: 60000,
            limit: 60,
          },
        ],
      }),
    }),

    // Infrastructure Modules
    LoggerModule,
    DatabaseModule,
    CacheModule,
    QueueModule,
    StorageModule,
    // Health Check Module
    HealthModule,

    // Domain Modules
    AuthModule,
    UsersModule,
    SalonModule,
    ServiceCatalogModule,
    BookingModule,
    StaffModule,
    PaymentModule,
    CustomerModule,
    InventoryModule,
    ReviewsModule,
    PromotionsModule,
    NotificationsModule,
    MediaModule,
    AppConfigModule,
  ],
  controllers: [AppController],
  providers: [
    // Global Pipes
    {
      provide: APP_PIPE,
      useClass: TrimStringsPipe,
    },
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
