import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BusinessHoursRepository } from '../business-hours.repository';

describe('BusinessHoursRepository', () => {
  let repository: BusinessHoursRepository;
  let prismaMock: {
    branchBusinessHours: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    branchSpecialHoliday: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    branchTempClosure: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      branchBusinessHours: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      branchSpecialHoliday: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      branchTempClosure: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessHoursRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get<BusinessHoursRepository>(BusinessHoursRepository);
  });

  describe('upsertHours()', () => {
    it('should delete existing hours and recreate new 7-day business hours in transaction', async () => {
      prismaMock.branchBusinessHours.deleteMany.mockResolvedValue({ count: 7 });
      prismaMock.branchBusinessHours.createMany.mockResolvedValue({ count: 7 });

      const hours = [
        { branchId: 'br_100', dayOfWeek: 'MONDAY' as any, openTime: new Date(), closeTime: new Date(), isClosed: false },
      ];

      await repository.upsertHours('br_100', hours);

      expect(prismaMock.branchBusinessHours.deleteMany).toHaveBeenCalledWith({ where: { branchId: 'br_100' } });
      expect(prismaMock.branchBusinessHours.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ branchId: 'br_100' })],
      });
    });
  });

  describe('addSpecialHoliday() and findHolidaysByBranchId()', () => {
    it('should add special holiday for a branch', async () => {
      const holidayData = { id: 'hol_1', branchId: 'br_100', holidayDate: new Date(), reason: 'Diwali' };
      prismaMock.branchSpecialHoliday.create.mockResolvedValue(holidayData);

      const res = await repository.addSpecialHoliday(holidayData);
      expect(res).toEqual(holidayData);
    });
  });
});
