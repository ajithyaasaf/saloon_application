import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ALL_QUEUES } from '../../common/constants/queues.constant';
import { QueueService } from './queue.service';
import { ExampleProcessor } from './processors/example.processor';

/**
 * QueueModule — global module that registers all BullMQ queues
 * and provides QueueService.
 *
 * Design rules (from Phase 5 architecture §10):
 *  - All queues are registered here using constants from queues.constant.ts.
 *  - QueueService is the ONLY public API for dispatching jobs.
 *  - Worker processors are also registered here and inject infra services only.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('bullmq.redis.host', 'localhost'),
          port: configService.get<number>('bullmq.redis.port', 6379),
          password: configService.get<string | undefined>(
            'bullmq.redis.password',
          ),
        },
        defaultJobOptions: {
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      }),
      inject: [ConfigService],
    }),
    // Register all queues using the typed constants array
    ...ALL_QUEUES.map((queueName) =>
      BullModule.registerQueue({ name: queueName }),
    ),
  ],
  providers: [QueueService, ExampleProcessor],
  exports: [QueueService],
})
export class QueueModule {}
