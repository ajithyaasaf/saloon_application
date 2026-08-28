import { Test, TestingModule } from '@nestjs/testing';
import { EmploymentStatus, StaffRole } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StaffRepository } from '../repositories/staff.repository';

describe('StaffRepository', () => {
  let repository: StaffRepository;
  let prisma: any;

  const mockStaff = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: '123e4567-e89b-12d3-a456-426614174009',
    salonId: '123e4567-e89b-12d3-a456-426614174001',
    employeeCode: 'EMP001',
    displayName: 'Jane Doe',
    role: StaffRole.STYLIST,
    employmentStatus: EmploymentStatus.ACTIVE,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      staff: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<StaffRepository>(StaffRepository);
  });

  describe('findById', () => {
    it('should return staff when found', async () => {
      prisma.staff.findFirst.mockResolvedValue(mockStaff);
      const result = await repository.findById(mockStaff.id);
      expect(result).toEqual(mockStaff);
      expect(prisma.staff.findFirst).toHaveBeenCalledWith({
        where: { id: mockStaff.id, deletedAt: null },
      });
    });
  });

  describe('findByUserId', () => {
    it('should find staff by linked user id', async () => {
      prisma.staff.findFirst.mockResolvedValue(mockStaff);
      const result = await repository.findByUserId('123e4567-e89b-12d3-a456-426614174009');
      expect(result).toEqual(mockStaff);
    });
  });

  describe('findByEmployeeCode', () => {
    it('should find staff by salon and code', async () => {
      prisma.staff.findFirst.mockResolvedValue(mockStaff);
      const result = await repository.findByEmployeeCode(mockStaff.salonId, 'EMP001');
      expect(result).toEqual(mockStaff);
    });
  });

  describe('create', () => {
    it('should create new staff with version 1', async () => {
      prisma.staff.create.mockResolvedValue(mockStaff);
      const result = await repository.create({
        salonId: mockStaff.salonId,
        displayName: mockStaff.displayName,
        role: mockStaff.role,
        employeeCode: mockStaff.employeeCode,
      });
      expect(result).toEqual(mockStaff);
    });
  });

  describe('update', () => {
    it('should update staff when version matches', async () => {
      prisma.staff.findFirst.mockResolvedValue(mockStaff);
      prisma.staff.update.mockResolvedValue({ ...mockStaff, version: 2, displayName: 'Jane Smith' });

      const result = await repository.update(mockStaff.id, 1, { displayName: 'Jane Smith' });
      expect(result.version).toBe(2);
    });

    it('should throw ConflictException on optimistic concurrency mismatch', async () => {
      prisma.staff.findFirst.mockResolvedValue(mockStaff);

      await expect(repository.update(mockStaff.id, 999, { displayName: 'Jane Smith' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt and ARCHIVED status', async () => {
      prisma.staff.findFirst.mockResolvedValue(mockStaff);
      prisma.staff.update.mockResolvedValue({ ...mockStaff, deletedAt: new Date(), employmentStatus: EmploymentStatus.ARCHIVED });

      await repository.softDelete(mockStaff.id, 1);
      expect(prisma.staff.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockStaff.id },
          data: expect.objectContaining({
            employmentStatus: EmploymentStatus.ARCHIVED,
          }),
        }),
      );
    });
  });

  describe('search', () => {
    it('should return paginated staff list', async () => {
      prisma.staff.findMany.mockResolvedValue([mockStaff]);
      prisma.staff.count.mockResolvedValue(1);

      const result = await repository.search({ page: 1, limit: 10, search: 'Jane' });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
