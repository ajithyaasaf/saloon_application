import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  BranchRatingSummaryRepository,
  SalonRatingSummaryRepository,
  ServiceRatingSummaryRepository,
  StaffRatingSummaryRepository,
} from '../repositories/reputation-summary.repository';

describe('ReputationSummaryRepository Suite', () => {
  let salonSummaryRepo: SalonRatingSummaryRepository;
  let branchSummaryRepo: BranchRatingSummaryRepository;
  let staffSummaryRepo: StaffRatingSummaryRepository;
  let serviceSummaryRepo: ServiceRatingSummaryRepository;
  let db: any;

  const mockSalonSummary = {
    id: 'sum-sal-1',
    salonId: 'sal-uuid-1',
    totalReviews: 50,
    averageRating: 4.85,
    oneStarCount: 0,
    twoStarCount: 1,
    threeStarCount: 2,
    fourStarCount: 5,
    fiveStarCount: 42,
    npsScore: 88.0,
    bayesianScore: 4.75,
    lastCalculatedAt: new Date(),
  };

  const mockBranchSummary = {
    id: 'sum-br-1',
    branchId: 'br-uuid-1',
    salonId: 'sal-uuid-1',
    totalReviews: 25,
    averageRating: 4.9,
    oneStarCount: 0,
    twoStarCount: 0,
    threeStarCount: 1,
    fourStarCount: 3,
    fiveStarCount: 21,
    npsScore: 92.0,
    lastCalculatedAt: new Date(),
  };

  const mockStaffSummary = {
    id: 'sum-stf-1',
    staffId: 'stf-uuid-1',
    salonId: 'sal-uuid-1',
    totalReviews: 30,
    averageRating: 4.95,
    fiveStarRate: 96.67,
    lastCalculatedAt: new Date(),
  };

  const mockServiceSummary = {
    id: 'sum-srv-1',
    serviceId: 'srv-uuid-1',
    salonId: 'sal-uuid-1',
    totalReviews: 40,
    averageRating: 4.88,
    lastCalculatedAt: new Date(),
  };

  beforeEach(async () => {
    db = {
      salonRatingSummary: {
        findUnique: jest.fn().mockResolvedValue(mockSalonSummary),
        create: jest.fn().mockResolvedValue(mockSalonSummary),
        update: jest.fn().mockResolvedValue(mockSalonSummary),
        upsert: jest.fn().mockResolvedValue(mockSalonSummary),
      },
      branchRatingSummary: {
        findUnique: jest.fn().mockResolvedValue(mockBranchSummary),
        findMany: jest.fn().mockResolvedValue([mockBranchSummary]),
        create: jest.fn().mockResolvedValue(mockBranchSummary),
        update: jest.fn().mockResolvedValue(mockBranchSummary),
        upsert: jest.fn().mockResolvedValue(mockBranchSummary),
      },
      staffRatingSummary: {
        findUnique: jest.fn().mockResolvedValue(mockStaffSummary),
        findMany: jest.fn().mockResolvedValue([mockStaffSummary]),
        create: jest.fn().mockResolvedValue(mockStaffSummary),
        update: jest.fn().mockResolvedValue(mockStaffSummary),
        upsert: jest.fn().mockResolvedValue(mockStaffSummary),
      },
      serviceRatingSummary: {
        findUnique: jest.fn().mockResolvedValue(mockServiceSummary),
        findMany: jest.fn().mockResolvedValue([mockServiceSummary]),
        create: jest.fn().mockResolvedValue(mockServiceSummary),
        update: jest.fn().mockResolvedValue(mockServiceSummary),
        upsert: jest.fn().mockResolvedValue(mockServiceSummary),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalonRatingSummaryRepository,
        BranchRatingSummaryRepository,
        StaffRatingSummaryRepository,
        ServiceRatingSummaryRepository,
        { provide: PrismaService, useValue: db },
      ],
    }).compile();

    salonSummaryRepo = module.get<SalonRatingSummaryRepository>(SalonRatingSummaryRepository);
    branchSummaryRepo = module.get<BranchRatingSummaryRepository>(BranchRatingSummaryRepository);
    staffSummaryRepo = module.get<StaffRatingSummaryRepository>(StaffRatingSummaryRepository);
    serviceSummaryRepo = module.get<ServiceRatingSummaryRepository>(
      ServiceRatingSummaryRepository,
    );
  });

  describe('SalonRatingSummaryRepository', () => {
    it('should find salon summary', async () => {
      const res = await salonSummaryRepo.findBySalon('sal-uuid-1');
      expect(res).toEqual(mockSalonSummary);
    });

    it('should upsert salon summary', async () => {
      const res = await salonSummaryRepo.upsert('sal-uuid-1', {
        salonId: 'sal-uuid-1',
        totalReviews: 50,
        averageRating: 4.85,
      });
      expect(res).toEqual(mockSalonSummary);
      expect(db.salonRatingSummary.upsert).toHaveBeenCalled();
    });
  });

  describe('BranchRatingSummaryRepository', () => {
    it('should find branch summary', async () => {
      const res = await branchSummaryRepo.findByBranch('br-uuid-1');
      expect(res).toEqual(mockBranchSummary);
    });

    it('should upsert branch summary', async () => {
      const res = await branchSummaryRepo.upsert('br-uuid-1', {
        branchId: 'br-uuid-1',
        salonId: 'sal-uuid-1',
        totalReviews: 25,
        averageRating: 4.9,
      });
      expect(res).toEqual(mockBranchSummary);
    });
  });

  describe('StaffRatingSummaryRepository', () => {
    it('should find staff summary', async () => {
      const res = await staffSummaryRepo.findByStaff('stf-uuid-1');
      expect(res).toEqual(mockStaffSummary);
    });

    it('should upsert staff summary', async () => {
      const res = await staffSummaryRepo.upsert('stf-uuid-1', {
        staffId: 'stf-uuid-1',
        salonId: 'sal-uuid-1',
        totalReviews: 30,
        averageRating: 4.95,
      });
      expect(res).toEqual(mockStaffSummary);
    });
  });

  describe('ServiceRatingSummaryRepository', () => {
    it('should find service summary', async () => {
      const res = await serviceSummaryRepo.findByService('srv-uuid-1');
      expect(res).toEqual(mockServiceSummary);
    });

    it('should upsert service summary', async () => {
      const res = await serviceSummaryRepo.upsert('srv-uuid-1', {
        serviceId: 'srv-uuid-1',
        salonId: 'sal-uuid-1',
        totalReviews: 40,
        averageRating: 4.88,
      });
      expect(res).toEqual(mockServiceSummary);
    });
  });
});
