import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus, NotificationChannel, ReviewInvitationStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { ReviewInvitationRepository } from '../repositories/review-invitation.repository';
import { ReviewInvitationService } from '../services/review-invitation.service';

describe('ReviewInvitationService', () => {
  let service: ReviewInvitationService;
  let invitationRepo: any;
  let prisma: any;
  let auditService: any;
  let eventBus: any;

  const mockBooking = {
    id: 'bk-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    customerId: 'cust-1',
    status: BookingStatus.COMPLETED,
  };

  const mockInvitation = {
    id: 'inv-1',
    bookingId: 'bk-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    customerId: 'cust-1',
    channel: NotificationChannel.PUSH,
    invitationToken: 'tok-1234567890abcdef',
    status: ReviewInvitationStatus.PENDING,
    expiresAt: new Date(Date.now() + 86400000 * 7),
  };

  beforeEach(async () => {
    invitationRepo = {
      findById: jest.fn().mockResolvedValue(mockInvitation),
      findByBooking: jest.fn().mockResolvedValue(null),
      findByToken: jest.fn().mockResolvedValue(mockInvitation),
      create: jest.fn().mockResolvedValue(mockInvitation),
      markSent: jest.fn().mockResolvedValue({ ...mockInvitation, status: ReviewInvitationStatus.SENT }),
      markOpened: jest.fn().mockResolvedValue({ ...mockInvitation, status: ReviewInvitationStatus.OPENED }),
      markCompleted: jest.fn().mockResolvedValue({ ...mockInvitation, status: ReviewInvitationStatus.COMPLETED }),
      markFailed: jest.fn().mockResolvedValue({ ...mockInvitation, status: ReviewInvitationStatus.FAILED }),
      markExpired: jest.fn().mockResolvedValue({ ...mockInvitation, status: ReviewInvitationStatus.EXPIRED }),
      search: jest.fn().mockResolvedValue({ data: [mockInvitation], total: 1 }),
    };

    prisma = {
      booking: {
        findUnique: jest.fn().mockResolvedValue(mockBooking),
      },
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    eventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewInvitationService,
        { provide: ReviewInvitationRepository, useValue: invitationRepo },
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<ReviewInvitationService>(ReviewInvitationService);
  });

  it('should create review invitation for completed booking', async () => {
    const res = await service.createInvitation({
      bookingId: 'bk-1',
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
    });
    expect(res.id).toBe('inv-1');
    expect(invitationRepo.create).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should reject review invitation for non-completed booking', async () => {
    prisma.booking.findUnique.mockResolvedValueOnce({
      ...mockBooking,
      status: BookingStatus.PENDING,
    });

    await expect(
      service.createInvitation({
        bookingId: 'bk-1',
        salonId: 'sal-1',
        branchId: 'br-1',
        customerId: 'cust-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject duplicate review invitation for same booking', async () => {
    invitationRepo.findByBooking.mockResolvedValueOnce(mockInvitation);

    await expect(
      service.createInvitation({
        bookingId: 'bk-1',
        salonId: 'sal-1',
        branchId: 'br-1',
        customerId: 'cust-1',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should validate and open valid invitation token', async () => {
    const res = await service.validateAndOpenToken('tok-1234567890abcdef');
    expect(res.status).toBe(ReviewInvitationStatus.OPENED);
    expect(invitationRepo.markOpened).toHaveBeenCalledWith('inv-1');
  });

  it('should reject expired invitation token', async () => {
    invitationRepo.findByToken.mockResolvedValueOnce({
      ...mockInvitation,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(service.validateAndOpenToken('tok-1234567890abcdef')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject already completed invitation token', async () => {
    invitationRepo.findByToken.mockResolvedValueOnce({
      ...mockInvitation,
      status: ReviewInvitationStatus.COMPLETED,
    });

    await expect(service.validateAndOpenToken('tok-1234567890abcdef')).rejects.toThrow(
      BadRequestException,
    );
  });
});
