import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NOTIFICATION_SMS } from '../../../common/constants/queues.constant';

/**
 * ExampleProcessor — skeleton processor for the SMS notification queue.
 *
 * This is a demonstration of how BullMQ processors are structured.
 * It does not implement any real business logic.
 *
 * Real processors will be added in Phase 7 (Notification Module implementation).
 * Each processor lives in infrastructure/queue/processors/ and injects
 * infrastructure services (FcmService, SmsService) — never domain services.
 */
@Processor(QUEUE_NOTIFICATION_SMS)
export class ExampleProcessor extends WorkerHost {
  private readonly logger = new Logger(ExampleProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing job "${job.name}" [id=${job.id}]`);
    // Real implementation will call SmsService here
  }
}
