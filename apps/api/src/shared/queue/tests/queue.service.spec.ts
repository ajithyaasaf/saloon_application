import { Test, TestingModule } from '@nestjs/testing';
import { QueueException } from '../../../common/exceptions/queue.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { QUEUE_NOTIFICATION_EMAIL } from '../../../common/constants/queues.constant';
import { QueueService as InfraQueueService } from '../../../infrastructure/queue/queue.service';
import { QueueService } from '../queue.service';

describe('QueueService', () => {
  let service: QueueService;
  let infraQueueMock: { dispatch: jest.Mock };

  beforeEach(async () => {
    infraQueueMock = {
      dispatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: InfraQueueService, useValue: infraQueueMock },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  describe('addJob()', () => {
    it('should dispatch job through infra queue adapter', async () => {
      infraQueueMock.dispatch.mockResolvedValue(undefined);

      const res = await service.addJob(
        QUEUE_NOTIFICATION_EMAIL,
        'email.welcome',
        { to: 'user@example.com' },
        { delayMs: 500, jobId: 'custom_job_id_100' },
      );

      expect(res.jobId).toBe('custom_job_id_100');
      expect(infraQueueMock.dispatch).toHaveBeenCalledWith(
        QUEUE_NOTIFICATION_EMAIL,
        'email.welcome',
        { to: 'user@example.com' },
        expect.objectContaining({ delay: 500, jobId: 'custom_job_id_100' }),
      );
    });

    it('should throw ValidationException on invalid queueName or jobName', async () => {
      await expect(service.addJob('', 'JOB', {})).rejects.toThrow(ValidationException);
      await expect(service.addJob('queue', '', {})).rejects.toThrow(ValidationException);
    });

    it('should wrap dispatch errors in QueueException and propagate cause', async () => {
      infraQueueMock.dispatch.mockRejectedValue(new Error('Redis connection lost'));

      await expect(
        service.addJob(QUEUE_NOTIFICATION_EMAIL, 'email.send', {}),
      ).rejects.toThrow(QueueException);
    });
  });

  describe('schedule()', () => {
    it('should calculate delayMs and schedule job in the future', async () => {
      infraQueueMock.dispatch.mockResolvedValue(undefined);
      const futureDate = new Date(Date.now() + 60000);

      const res = await service.schedule(
        QUEUE_NOTIFICATION_EMAIL,
        'email.reminder',
        { bookingId: 'b_123' },
        futureDate,
      );

      expect(res.jobId).toBeDefined();
      expect(infraQueueMock.dispatch).toHaveBeenCalledWith(
        QUEUE_NOTIFICATION_EMAIL,
        'email.reminder',
        { bookingId: 'b_123' },
        expect.objectContaining({ delay: expect.any(Number) }),
      );
    });

    it('should throw ValidationException if runAt date is in the past or invalid', async () => {
      const pastDate = new Date(Date.now() - 10000);

      await expect(
        service.schedule(QUEUE_NOTIFICATION_EMAIL, 'PAST_JOB', {}, pastDate),
      ).rejects.toThrow(ValidationException);

      await expect(
        service.schedule(QUEUE_NOTIFICATION_EMAIL, 'INVALID_DATE', {}, new Date('invalid')),
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('cancel() and retry()', () => {
    it('should request job cancellation', async () => {
      const result = await service.cancel(QUEUE_NOTIFICATION_EMAIL, 'job_123');
      expect(result).toBe(true);
    });

    it('should request job retry', async () => {
      const result = await service.retry(QUEUE_NOTIFICATION_EMAIL, 'job_123');
      expect(result).toBe(true);
    });

    it('should throw ValidationException if parameters are missing', async () => {
      await expect(service.cancel('', 'job_1')).rejects.toThrow(ValidationException);
      await expect(service.retry('queue', '')).rejects.toThrow(ValidationException);
    });
  });
});
