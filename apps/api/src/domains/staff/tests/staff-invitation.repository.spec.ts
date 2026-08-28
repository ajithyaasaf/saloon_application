import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StaffInvitationRepository } from '../repositories/staff-invitation.repository';

describe('StaffInvitationRepository', () => {
  let repository: StaffInvitationRepository;
  let prisma: any;

  const mockToken = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    staffId: '123e4567-e89b-12d3-a456-426614174001',
    tokenHash: 'abc123hash',
    expiresAt: new Date(Date.now() + 86400000),
    usedAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      staffInvitationToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffInvitationRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<StaffInvitationRepository>(StaffInvitationRepository);
  });

  describe('create', () => {
    it('should create invitation token record', async () => {
      prisma.staffInvitationToken.create.mockResolvedValue(mockToken);
      const result = await repository.create({
        staffId: mockToken.staffId,
        tokenHash: mockToken.tokenHash,
        expiresAt: mockToken.expiresAt,
      });
      expect(result).toEqual(mockToken);
    });
  });

  describe('findByHash', () => {
    it('should find token by hash', async () => {
      prisma.staffInvitationToken.findUnique.mockResolvedValue(mockToken);
      const result = await repository.findByHash(mockToken.tokenHash);
      expect(result).toEqual(mockToken);
    });
  });

  describe('findActiveToken', () => {
    it('should query for active non-expired unused token', async () => {
      prisma.staffInvitationToken.findFirst.mockResolvedValue(mockToken);
      const result = await repository.findActiveToken(mockToken.staffId);
      expect(result).toEqual(mockToken);
    });
  });

  describe('markUsed', () => {
    it('should update usedAt timestamp', async () => {
      prisma.staffInvitationToken.update.mockResolvedValue({ ...mockToken, usedAt: new Date() });
      const result = await repository.markUsed(mockToken.id);
      expect(result.usedAt).not.toBeNull();
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired tokens and return count', async () => {
      prisma.staffInvitationToken.deleteMany.mockResolvedValue({ count: 5 });
      const count = await repository.deleteExpired();
      expect(count).toBe(5);
    });
  });
});
