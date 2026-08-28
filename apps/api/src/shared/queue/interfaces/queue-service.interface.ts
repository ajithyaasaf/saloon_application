import { QueueJobOptions } from '../types/job-options.type';

/**
 * IQueueService — Provider-agnostic public contract for asynchronous job queuing.
 *
 * Architecture ref: Phase 9.2 §4.6
 */
export interface IQueueService {
  addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    opts?: QueueJobOptions,
  ): Promise<{ jobId: string }>;

  schedule<T>(
    queueName: string,
    jobName: string,
    data: T,
    runAt: Date,
  ): Promise<{ jobId: string }>;

  cancel(queueName: string, jobId: string): Promise<boolean>;
  retry(queueName: string, jobId: string): Promise<boolean>;
}
