import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { BookingReservationLockRepository } from '../repositories/booking-reservation-lock.repository';
import { ReservationService } from '../services/reservation.service';

describe('ReservationService', () => {
  let service: ReservationService;
  let lockRepository: any;
  let transactionService: any;
  let auditService: any;
  let cacheService: any;
  let eventBusService: any;

  const mockLock = {
    id: 'lck_123e4567-e89b-12d3-a456-426614174000',
    lockKey: 'branch:br1:staff:stf1:date:2026-08-08:slot:10:00',
    branchId: 'br_123e4567-e89b-12d3-a456-426614174002',
    staffId: 'stf_123e4567-e89b-12d3-a456-426614174003',
    customerId: 'usr_123e4567-e89b-12d3-a456-426614174004',
    startTime: new Date('2026-08-08T10:00:00.000Z'),
    endTime: new Date('2026-08-08T11:00:00.000Z'),
    expiresAt: new Date(Date.now() + 600000),
    refreshCount: 0,
    isReleased: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    lockRepository = {
      findByLockKey: jest.fn(),
      findExpired: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      release: jest.fn(),
    };
    transactionService = {
      run: jest.fn((cb) => cb({})),
    };
    auditService = {
      logInTransaction: jest.fn(),
    };
    cacheService = {
      delete: jest.fn(),
    };
    eventBusService = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        { provide: BookingReservationLockRepository, useValue: lockRepository },
        { provide: TransactionService, useValue: transactionService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBusService },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully', async () => {
      lockRepository.findByLockKey.mockResolvedValue(null);
      lockRepository.create.mockResolvedValue(mockLock);

      const result = await service.acquireLock({
        lockKey: mockLock.lockKey,
        branchId: mockLock.branchId,
        staffId: mockLock.staffId,
        customerId: mockLock.customerId,
        startTime: mockLock.startTime,
        endTime: mockLock.endTime,
        expiresAt: mockLock.expiresAt,
      });

      expect(result.lockKey).toBe(mockLock.lockKey);
      expect(eventBusService.publish).toHaveBeenCalled();
    });

    it('should throw ConflictException if lock is already active', async () => {
      lockRepository.findByLockKey.mockResolvedValue(mockLock);

      await expect(
        service.acquireLock({
          lockKey: mockLock.lockKey,
          branchId: mockLock.branchId,
          staffId: mockLock.staffId,
          customerId: mockLock.customerId,
          startTime: mockLock.startTime,
          endTime: mockLock.endTime,
          expiresAt: mockLock.expiresAt,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('extendLock', () => {
    it('should extend lock expiration time by +5 mins', async () => {
      lockRepository.findByLockKey.mockResolvedValue(mockLock);
      lockRepository.update.mockResolvedValue({ ...mockLock, refreshCount: 1 });

      const result = await service.extendLock(mockLock.lockKey, mockLock.customerId);
      expect(result.refreshCount).toBe(1);
    });

    it('should throw ValidationException if max refresh count reached', async () => {
      lockRepository.findByLockKey.mockResolvedValue({ ...mockLock, refreshCount: 1 });

      await expect(service.extendLock(mockLock.lockKey, mockLock.customerId)).rejects.toThrow(ValidationException);
    });
  });

  describe('releaseLock', () => {
    it('should release lock and publish event', async () => {
      lockRepository.findByLockKey.mockResolvedValue(mockLock);

      await service.releaseLock(mockLock.lockKey);
      expect(lockRepository.release).toHaveBeenCalledWith(mockLock.lockKey, {});
      expect(eventBusService.publish).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredLocks', () => {
    it('should release all expired locks', async () => {
      lockRepository.findExpired.mockResolvedValue([mockLock]);
      lockRepository.findByLockKey.mockResolvedValue(mockLock);

      const count = await service.cleanupExpiredLocks();
      expect(count).toBe(1);
    });
  });
});
