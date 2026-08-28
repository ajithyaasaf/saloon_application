import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StaffBranchAssignmentRepository } from '../repositories/staff-branch-assignment.repository';

describe('StaffBranchAssignmentRepository', () => {
  let repository: StaffBranchAssignmentRepository;
  let prisma: any;

  const mockAssignment = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    staffId: '123e4567-e89b-12d3-a456-426614174001',
    branchId: '123e4567-e89b-12d3-a456-426614174002',
    isPrimary: true,
    startDate: new Date('2026-08-01'),
    endDate: null,
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      staffBranchAssignment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffBranchAssignmentRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<StaffBranchAssignmentRepository>(StaffBranchAssignmentRepository);
  });

  describe('findById', () => {
    it('should find assignment by id', async () => {
      prisma.staffBranchAssignment.findFirst.mockResolvedValue(mockAssignment);
      const result = await repository.findById(mockAssignment.id);
      expect(result).toEqual(mockAssignment);
    });
  });

  describe('findAssignments', () => {
    it('should find all active assignments for staff', async () => {
      prisma.staffBranchAssignment.findMany.mockResolvedValue([mockAssignment]);
      const result = await repository.findAssignments(mockAssignment.staffId);
      expect(result).toHaveLength(1);
    });
  });

  describe('findPrimaryBranch', () => {
    it('should find primary branch assignment', async () => {
      prisma.staffBranchAssignment.findFirst.mockResolvedValue(mockAssignment);
      const result = await repository.findPrimaryBranch(mockAssignment.staffId);
      expect(result?.isPrimary).toBe(true);
    });
  });

  describe('create', () => {
    it('should create new branch assignment', async () => {
      prisma.staffBranchAssignment.create.mockResolvedValue(mockAssignment);
      const result = await repository.create({
        staffId: mockAssignment.staffId,
        branchId: mockAssignment.branchId,
        isPrimary: true,
        startDate: mockAssignment.startDate,
      });
      expect(result).toEqual(mockAssignment);
    });
  });

  describe('update', () => {
    it('should update assignment when version matches', async () => {
      prisma.staffBranchAssignment.findFirst.mockResolvedValue(mockAssignment);
      prisma.staffBranchAssignment.update.mockResolvedValue({ ...mockAssignment, version: 2, isPrimary: false });

      const result = await repository.update(mockAssignment.id, 1, { isPrimary: false });
      expect(result.version).toBe(2);
    });

    it('should throw ConflictException on version mismatch', async () => {
      prisma.staffBranchAssignment.findFirst.mockResolvedValue(mockAssignment);

      await expect(repository.update(mockAssignment.id, 999, { isPrimary: false })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt and isActive=false', async () => {
      prisma.staffBranchAssignment.findFirst.mockResolvedValue(mockAssignment);
      prisma.staffBranchAssignment.update.mockResolvedValue({ ...mockAssignment, deletedAt: new Date(), isActive: false });

      await repository.softDelete(mockAssignment.id, 1);
      expect(prisma.staffBranchAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockAssignment.id },
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });
});
