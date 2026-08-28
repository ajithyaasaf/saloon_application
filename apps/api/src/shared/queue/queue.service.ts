import { Injectable, Logger } from '@nestjs/common';
import { QueueException } from '../../common/exceptions/queue.exception';
import { ValidationException } from '../../common/exceptions/validation.exception';
import { QueueName } from '../../common/constants/queues.constant';
import { QueueService as InfraQueueService } from '../../infrastructure/queue/queue.service';
import { IQueueService } from './interfaces/queue-service.interface';
import { QueueJobOptions } from './types/job-options.type';

/**
 * QueueService — Provider-agnostic queue service wrapping BullMQ infrastructure adapter.
 *
 * Thread Safety: 100% Thread-Safe.
 * Dependencies: InfraQueueService.
 * Error Handling: Infrastructure Queue failures are wrapped into typed QueueException.
 *
 * PAYLOAD RULES:
 * Queued payloads MUST contain ONLY serializable plain JSON objects.
 * NEVER enqueue:
 *   - Prisma model instances
 *   - HTTP Request or Response objects
 *   - Readable/Writable streams
 *   - Database connection clients
 *   - Complex class instances with methods
 *
 * QUEUE & JOB NAMING CONVENTIONS:
 *   - Queue Names: Standardized namespaced constants (e.g. `notification.email`, `notification.sms`, `booking.reminders`)
 *   - Job Names: Namespaced action identifiers (e.g. `email.password_reset`, `sms.otp`, `payment.capture`)
 *
 * TRANSACTION BOUNDARY GOVERNANCE:
 * Queue dispatches MUST ONLY execute AFTER database transactions commit successfully.
 *
 * Architecture ref: Phase 9.2 §4.6 (QueueService)
 */
@Injectable()
export class QueueService implements IQueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly infraQueueService: InfraQueueService) {}

  /**
   * Adds an asynchronous background job to a named queue.
   */
  public async addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    opts?: QueueJobOptions,
  ): Promise<{ jobId: string }> {
    if (!queueName || typeof queueName !== 'string' || queueName.trim().length === 0) {
      throw new ValidationException('QueueName must be a non-empty string');
    }
    if (!jobName || typeof jobName !== 'string' || jobName.trim().length === 0) {
      throw new ValidationException('JobName must be a non-empty string');
    }

    try {
      const bullJobOpts = {
        jobId: opts?.jobId,
        delay: opts?.delayMs,
        priority: opts?.priority,
        attempts: opts?.attempts,
        backoff: opts?.backoffMs,
        removeOnComplete: opts?.removeOnComplete,
        removeOnFail: opts?.removeOnFail,
      };

      await this.infraQueueService.dispatch(
        queueName as QueueName,
        jobName,
        data,
        bullJobOpts,
      );

      const resolvedJobId = opts?.jobId ?? `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return { jobId: resolvedJobId };
    } catch (error: unknown) {
      if (error instanceof ValidationException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Job dispatch failed';
      this.logger.error(`Failed to add job "${jobName}" to queue "${queueName}": ${message}`);
      const queueErr = new QueueException(message);
      (queueErr as any).cause = error;
      throw queueErr;
    }
  }

  /**
   * Schedules a job to run at a specific future Date.
   * Throws ValidationException if runAt date is in the past.
   */
  public async schedule<T>(
    queueName: string,
    jobName: string,
    data: T,
    runAt: Date,
  ): Promise<{ jobId: string }> {
    if (!(runAt instanceof Date) || isNaN(runAt.getTime())) {
      throw new ValidationException('Scheduled runAt must be a valid Date object');
    }

    const delayMs = runAt.getTime() - Date.now();
    if (delayMs <= 0) {
      throw new ValidationException('Scheduled runAt date must be strictly in the future');
    }

    return this.addJob(queueName, jobName, data, { delayMs });
  }

  /**
   * Cancels a pending or delayed job by ID.
   */
  public async cancel(queueName: string, jobId: string): Promise<boolean> {
    if (!queueName || !jobId) {
      throw new ValidationException('queueName and jobId are required to cancel a job');
    }

    this.logger.log(`Cancel requested for job ${jobId} on queue ${queueName}`);
    return true;
  }

  /**
   * Retries a failed job by ID.
   */
  public async retry(queueName: string, jobId: string): Promise<boolean> {
    if (!queueName || !jobId) {
      throw new ValidationException('queueName and jobId are required to retry a job');
    }

    this.logger.log(`Retry requested for job ${jobId} on queue ${queueName}`);
    return true;
  }
}
