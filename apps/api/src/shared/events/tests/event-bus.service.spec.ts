import { Test, TestingModule } from '@nestjs/testing';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { QueueService } from '../../queue/queue.service';
import { BaseDomainEvent } from '../base/domain-event.base';
import { EventBusService } from '../event-bus.service';

class SampleBookingCreatedEvent extends BaseDomainEvent<{ bookingId: string }> {
  constructor(bookingId: string) {
    super('booking.created.v1', bookingId, 1, { bookingId });
  }
}

describe('EventBusService', () => {
  let service: EventBusService;
  let queueServiceMock: { addJob: jest.Mock };

  beforeEach(async () => {
    queueServiceMock = {
      addJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBusService,
        { provide: QueueService, useValue: queueServiceMock },
      ],
    }).compile();

    service = module.get<EventBusService>(EventBusService);
  });

  describe('publish() and subscribe()', () => {
    it('should invoke subscriber callback when event is published', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const unsubscribe = service.subscribe('booking.created.v1', handler);

      const event = new SampleBookingCreatedEvent('b_100');
      await service.publish(event);

      expect(handler).toHaveBeenCalledWith(event);
      expect(handler).toHaveBeenCalledTimes(1);

      // Test unsubscribe callback
      unsubscribe();
      await service.publish(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should isolate subscriber failures so remaining subscribers continue executing', async () => {
      const failingHandler = jest.fn().mockRejectedValue(new Error('Subscriber A failed'));
      const successfulHandler = jest.fn().mockResolvedValue(undefined);

      service.subscribe('booking.created.v1', failingHandler);
      service.subscribe('booking.created.v1', successfulHandler);

      const event = new SampleBookingCreatedEvent('b_101');
      await service.publish(event);

      expect(failingHandler).toHaveBeenCalledWith(event);
      expect(successfulHandler).toHaveBeenCalledWith(event);
    });

    it('should publish batch of events with publishMany()', async () => {
      const handler = jest.fn();
      service.subscribe('booking.created.v1', handler);

      const evt1 = new SampleBookingCreatedEvent('b_1');
      const evt2 = new SampleBookingCreatedEvent('b_2');

      await service.publishMany([evt1, evt2]);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should throw ValidationException on invalid event version or missing name', async () => {
      const invalidEvent = {
        eventName: 'booking.created.v1',
        aggregateId: 'b_1',
        version: 0,
        payload: {},
      };

      await expect(service.publish(invalidEvent as any)).rejects.toThrow(ValidationException);
    });
  });

  describe('publishAsync()', () => {
    it('should push event to queue Service for background processing', async () => {
      queueServiceMock.addJob.mockResolvedValue({ jobId: 'job_evt_1' });

      const event = new SampleBookingCreatedEvent('b_200');
      await service.publishAsync(event);

      expect(queueServiceMock.addJob).toHaveBeenCalledWith(
        'events.domain',
        'event.booking.created.v1',
        event,
      );
    });
  });
});
