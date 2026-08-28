import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StaffServiceAssignmentRepository } from '../repositories/staff-service-assignment.repository';

describe('StaffServiceAssignmentRepository', () => {
  let repository: StaffServiceAssignmentRepository;
  let prisma: any;

  const mockServiceAssignment = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    staffId: '123e4567-e89b-12d3-a456-426614174001',
    branchServiceId: '123e4567-e89b-12d3-a456-426614174002',
    isActive: true,
    assignedAt: new Date(),
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      staffServiceAssignment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffServiceAssignmentRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<StaffServiceAssignmentRepository>(StaffServiceAssignmentRepository);
  });

  describe('findById', () => {
    it('should find assignment by id', async () => {
      prisma.staffServiceAssignment.findFirst.mockResolvedValue(mockServiceAssignment);
      const result = await repository.findById(mockServiceAssignment.id);
      expect(result).toEqual(mockServiceAssignment);
    });
  });

  describe('findByStaff', () => {
    it('should find active service capabilities for staff', async () => {
      prisma.staffServiceAssignment.findMany.mockResolvedValue([mockServiceAssignment]);
      const result = await repository.findByStaff(mockServiceAssignment.staffId);
      expect(result).toHaveLength(1);
    });
  });

  describe('findAssignment', () => {
    it('should check existing pairing for staff and branch service', async () => {
      prisma.staffServiceAssignment.findFirst.mockResolvedValue(mockServiceAssignment);
      const result = await repository.findAssignment(mockServiceAssignment.staffId, mockServiceAssignment.branchServiceId);
      expect(result).toEqual(mockServiceAssignment);
    });
  });

  describe('create', () => {
    it('should create new service capability assignment', async () => {
      prisma.staffServiceAssignment.create.mockResolvedValue(mockServiceAssignment);
      const result = await repository.create({
        staffId: mockServiceAssignment.staffId,
        branchServiceId: mockServiceAssignment.branchServiceId,
      });
      expect(result).toEqual(mockServiceAssignment);
    });
  });

  describe('update', () => {
    it('should throw ConflictException on version mismatch', async () => {
      prisma.staffServiceAssignment.findFirst.mockResolvedValue(mockServiceAssignment);

      await expect(repository.update(mockServiceAssignment.id, 999, { isActive: false })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
