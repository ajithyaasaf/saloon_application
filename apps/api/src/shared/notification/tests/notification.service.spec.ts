import { Test, TestingModule } from '@nestjs/testing';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { QueueService } from '../../queue/queue.service';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { NotificationService } from '../notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let queueServiceMock: { addJob: jest.Mock; schedule: jest.Mock };

  beforeEach(async () => {
    queueServiceMock = {
      addJob: jest.fn(),
      schedule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: QueueService, useValue: queueServiceMock },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('send()', () => {
    const emailDto: SendNotificationDto = {
      recipient: 'customer@example.com',
      channel: 'EMAIL',
      templateId: 'WELCOME_EMAIL',
      templateVariables: { name: 'Alice' },
    };

    it('should route EMAIL channel to background queue via QueueService', async () => {
      queueServiceMock.addJob.mockResolvedValue({ jobId: 'job_email_1' });

      const res = await service.send(emailDto);

      expect(res.jobId).toBe('job_email_1');
      expect(res.channel).toBe('EMAIL');
      expect(res.status).toBe('QUEUED');
      expect(queueServiceMock.addJob).toHaveBeenCalledWith(
        'notification.email',
        'notification.email.WELCOME_EMAIL',
        emailDto,
        expect.objectContaining({ jobId: undefined }),
      );
    });

    it('should route SMS channel to SMS background queue', async () => {
      queueServiceMock.addJob.mockResolvedValue({ jobId: 'job_sms_1' });

      const smsDto: SendNotificationDto = {
        recipient: '+919876543210',
        channel: 'SMS',
        templateId: 'OTP_VERIFY',
      };

      const res = await service.send(smsDto);
      expect(res.jobId).toBe('job_sms_1');
      expect(queueServiceMock.addJob).toHaveBeenCalledWith(
        'notification.sms',
        'notification.sms.OTP_VERIFY',
        smsDto,
        expect.anything(),
      );
    });

    it('should schedule notification when scheduledAt date is supplied in the future', async () => {
      queueServiceMock.schedule.mockResolvedValue({ jobId: 'job_sched_1' });
      const futureDate = new Date(Date.now() + 3600000);

      const scheduledDto: SendNotificationDto = {
        ...emailDto,
        scheduledAt: futureDate,
      };

      const res = await service.send(scheduledDto);
      expect(res.status).toBe('SCHEDULED');
      expect(queueServiceMock.schedule).toHaveBeenCalledWith(
        'notification.email',
        'notification.email.WELCOME_EMAIL',
        scheduledDto,
        futureDate,
      );
    });

    it('should throw ValidationException on unsupported channel or missing recipient', async () => {
      await expect(service.send({ ...emailDto, channel: 'INVALID' as any })).rejects.toThrow(ValidationException);
      await expect(service.send({ ...emailDto, recipient: '' })).rejects.toThrow(ValidationException);
    });
  });

  describe('sendBulk()', () => {
    it('should batch process notifications', async () => {
      queueServiceMock.addJob.mockResolvedValue({ jobId: 'job_b1' });

      const dto: SendNotificationDto = {
        recipient: 'usr_1',
        channel: 'PUSH',
        templateId: 'APPOINTMENT_REMINDER',
      };

      const results = await service.sendBulk([dto, dto]);
      expect(results).toHaveLength(2);
      expect(queueServiceMock.addJob).toHaveBeenCalledTimes(2);
    });
  });

  describe('renderTemplate()', () => {
    it('should render template text with variables', async () => {
      const rendered = await service.renderTemplate('ORDER_CONFIRMATION', { orderId: 'ord_123' });
      expect(rendered.body).toContain('ord_123');
      expect(rendered.subject).toContain('ORDER_CONFIRMATION');
    });
  });
});
