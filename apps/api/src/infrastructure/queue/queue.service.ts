import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import {
  QueueName,
  QUEUE_NOTIFICATION_PUSH,
  QUEUE_NOTIFICATION_SMS,
  QUEUE_NOTIFICATION_WHATSAPP,
  QUEUE_NOTIFICATION_EMAIL,
  QUEUE_MEDIA_PROCESSING,
  QUEUE_CLEANUP_JOBS,
} from '../../common/constants/queues.constant';

/**
 * QueueService — typed job-dispatch facade.
 *
 * Design rules (from Phase 5 architecture §3.3):
 *  - Domain services call QueueService.dispatch() only.
 *  - Domain services NEVER inject a BullMQ Queue class directly.
 *  - All dispatch calls happen AFTER a database transaction commits.
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  private readonly queueMap: Map<QueueName, Queue>;

  constructor(
    @InjectQueue(QUEUE_NOTIFICATION_PUSH)
    private readonly pushQueue: Queue,

    @InjectQueue(QUEUE_NOTIFICATION_SMS)
    private readonly smsQueue: Queue,

    @InjectQueue(QUEUE_NOTIFICATION_WHATSAPP)
    private readonly whatsappQueue: Queue,

    @InjectQueue(QUEUE_NOTIFICATION_EMAIL)
    private readonly emailQueue: Queue,

    @InjectQueue(QUEUE_MEDIA_PROCESSING)
    private readonly mediaQueue: Queue,

    @InjectQueue(QUEUE_CLEANUP_JOBS)
    private readonly cleanupQueue: Queue,
  ) {
    this.queueMap = new Map([
      [QUEUE_NOTIFICATION_PUSH, this.pushQueue],
      [QUEUE_NOTIFICATION_SMS, this.smsQueue],
      [QUEUE_NOTIFICATION_WHATSAPP, this.whatsappQueue],
      [QUEUE_NOTIFICATION_EMAIL, this.emailQueue],
      [QUEUE_MEDIA_PROCESSING, this.mediaQueue],
      [QUEUE_CLEANUP_JOBS, this.cleanupQueue],
    ]);
  }

  /**
   * Dispatch a job to a named queue.
   *
   * @param queueName - One of the typed queue name constants from queues.constant.ts
   * @param jobName   - The job name (used by the processor to route handling)
   * @param payload   - Strongly typed job payload
   * @param opts      - Optional BullMQ job options (attempts, backoff, delay, etc.)
   */
  async dispatch<T>(
    queueName: QueueName,
    jobName: string,
    payload: T,
    opts?: JobsOptions,
  ): Promise<void> {
    const queue = this.queueMap.get(queueName);
    if (!queue) {
      this.logger.error(`Queue not found: ${queueName}`);
      throw new Error(`Queue not registered: ${queueName}`);
    }

    await queue.add(jobName, payload, opts);
    this.logger.debug(`Job dispatched → queue="${queueName}" job="${jobName}"`);
  }
}
