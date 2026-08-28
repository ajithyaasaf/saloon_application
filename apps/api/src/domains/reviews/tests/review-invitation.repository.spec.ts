import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannel, ReviewInvitationStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ReviewInvitationRepository } from '../repositories/review-invitation.repository';

describe('ReviewInvitationRepository Suite', () => {
  let invitationRepo: ReviewInvitationRepository;
  let db: any;

  const mockInvitation = {
    id: 'inv-uuid-1',
    bookingId: 'bk-uuid-1',
    salonId: 'sal-uuid-1',
    branchId: 'br-uuid-1',
    customerId: 'cust-uuid-1',
    channel: NotificationChannel.PUSH,
    invitationToken: 'tok-abc123xyz789',
    status: ReviewInvitationStatus.PENDING,
    sentAt: null,
    expiresAt: new Date(Date.now() + 86400000 * 7),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    db = {
      reviewInvitation: {
        findUnique: jest.fn().mockResolvedValue(mockInvitation),
        findMany: jest.fn().mockResolvedValue([mockInvitation]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockInvitation),
        update: jest.fn().mockResolvedValue(mockInvitation),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewInvitationRepository,
        { provide: PrismaService, useValue: db },
      ],
    }).compile();

    invitationRepo = module.get<ReviewInvitationRepository>(ReviewInvitationRepository);
  });

  describe('ReviewInvitationRepository', () => {
    it('should find invitation by ID', async () => {
      const res = await invitationRepo.findById('inv-uuid-1');
      expect(res).toEqual(mockInvitation);
    });

    it('should find invitation by token', async () => {
      const res = await invitationRepo.findByToken('tok-abc123xyz789');
      expect(res).toEqual(mockInvitation);
      expect(db.reviewInvitation.findUnique).toHaveBeenCalledWith({
        where: { invitationToken: 'tok-abc123xyz789' },
        include: { booking: true, salon: true, branch: true },
      });
    });

    it('should find invitation by booking ID', async () => {
      const res = await invitationRepo.findByBooking('bk-uuid-1');
      expect(res).toEqual(mockInvitation);
    });

    it('should find invitations by customer', async () => {
      const res = await invitationRepo.findByCustomer('cust-uuid-1');
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
    });

    it('should create review invitation', async () => {
      const res = await invitationRepo.create({
        bookingId: 'bk-uuid-1',
        salonId: 'sal-uuid-1',
        branchId: 'br-uuid-1',
        customerId: 'cust-uuid-1',
        invitationToken: 'tok-abc123xyz789',
        expiresAt: new Date(),
      });
      expect(res).toEqual(mockInvitation);
      expect(db.reviewInvitation.create).toHaveBeenCalled();
    });

    it('should mark invitation as sent', async () => {
      const res = await invitationRepo.markSent('inv-uuid-1');
      expect(res).toEqual(mockInvitation);
      expect(db.reviewInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-uuid-1' },
        data: expect.objectContaining({
          status: ReviewInvitationStatus.SENT,
          sentAt: expect.any(Date),
        }),
      });
    });

    it('should mark invitation as completed', async () => {
      const res = await invitationRepo.markCompleted('inv-uuid-1');
      expect(res).toEqual(mockInvitation);
      expect(db.reviewInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-uuid-1' },
        data: expect.objectContaining({
          status: ReviewInvitationStatus.COMPLETED,
          completedAt: expect.any(Date),
        }),
      });
    });
  });
});
