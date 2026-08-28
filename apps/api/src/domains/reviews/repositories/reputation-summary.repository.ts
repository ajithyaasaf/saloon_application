import { Injectable } from '@nestjs/common';
import {
  BranchRatingSummary,
  SalonRatingSummary,
  ServiceRatingSummary,
  StaffRatingSummary,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  CreateBranchRatingSummaryData,
  CreateSalonRatingSummaryData,
  CreateServiceRatingSummaryData,
  CreateStaffRatingSummaryData,
} from '../dto/review.dto';
import {
  IBranchRatingSummaryRepository,
  ISalonRatingSummaryRepository,
  IServiceRatingSummaryRepository,
  IStaffRatingSummaryRepository,
} from './interfaces/reputation-summary.repository.interface';

@Injectable()
export class SalonRatingSummaryRepository implements ISalonRatingSummaryRepository {
  constructor(private readonly db: PrismaService) {}

  public async findBySalon(salonId: string): Promise<SalonRatingSummary | null> {
    return this.db.salonRatingSummary.findUnique({ where: { salonId } });
  }

  public async create(data: CreateSalonRatingSummaryData): Promise<SalonRatingSummary> {
    return this.db.salonRatingSummary.create({
      data: {
        salonId: data.salonId,
        totalReviews: data.totalReviews ?? 0,
        averageRating: data.averageRating ?? 0.0,
        oneStarCount: data.oneStarCount ?? 0,
        twoStarCount: data.twoStarCount ?? 0,
        threeStarCount: data.threeStarCount ?? 0,
        fourStarCount: data.fourStarCount ?? 0,
        fiveStarCount: data.fiveStarCount ?? 0,
        npsScore: data.npsScore,
        bayesianScore: data.bayesianScore,
        lastCalculatedAt: data.lastCalculatedAt ?? new Date(),
      },
    });
  }

  public async update(
    salonId: string,
    data: Partial<CreateSalonRatingSummaryData>,
  ): Promise<SalonRatingSummary> {
    return this.db.salonRatingSummary.update({
      where: { salonId },
      data: {
        ...data,
        lastCalculatedAt: data.lastCalculatedAt ?? new Date(),
      },
    });
  }

  public async upsert(
    salonId: string,
    data: CreateSalonRatingSummaryData,
  ): Promise<SalonRatingSummary> {
    const payload = {
      totalReviews: data.totalReviews ?? 0,
      averageRating: data.averageRating ?? 0.0,
      oneStarCount: data.oneStarCount ?? 0,
      twoStarCount: data.twoStarCount ?? 0,
      threeStarCount: data.threeStarCount ?? 0,
      fourStarCount: data.fourStarCount ?? 0,
      fiveStarCount: data.fiveStarCount ?? 0,
      npsScore: data.npsScore,
      bayesianScore: data.bayesianScore,
      lastCalculatedAt: data.lastCalculatedAt ?? new Date(),
    };

    return this.db.salonRatingSummary.upsert({
      where: { salonId },
      create: {
        salonId,
        ...payload,
      },
      update: payload,
    });
  }
}

@Injectable()
export class BranchRatingSummaryRepository implements IBranchRatingSummaryRepository {
  constructor(private readonly db: PrismaService) {}

  public async findByBranch(branchId: string): Promise<BranchRatingSummary | null> {
    return this.db.branchRatingSummary.findUnique({ where: { branchId } });
  }

  public async findBySalon(salonId: string): Promise<BranchRatingSummary[]> {
    return this.db.branchRatingSummary.findMany({ where: { salonId } });
  }

  public async create(data: CreateBranchRatingSummaryData): Promise<BranchRatingSummary> {
    return this.db.branchRatingSummary.create({
      data: {
        branchId: data.branchId,
        salonId: data.salonId,
        totalReviews: data.totalReviews ?? 0,
        averageRating: data.averageRating ?? 0.0,
        oneStarCount: data.oneStarCount ?? 0,
        twoStarCount: data.twoStarCount ?? 0,
        threeStarCount: data.threeStarCount ?? 0,
        fourStarCount: data.fourStarCount ?? 0,
        fiveStarCount: data.fiveStarCount ?? 0,
        npsScore: data.npsScore,
        lastCalculatedAt: data.lastCalculatedAt ?? new Date(),
      },
    });
  }

  public async update(
    branchId: string,
    data: Partial<CreateBranchRatingSummaryData>,
  ): Promise<BranchRatingSummary> {
    return this.db.branchRatingSummary.update({
      where: { branchId },
      data: {
        ...data,
        lastCalculatedAt: data.lastCalculatedAt ?? new Date(),
      },
    });
  }

  public async upsert(
    branchId: string,
    data: CreateBranchRatingSummaryData,
  ): Promise<BranchRatingSummary> {
    const payload = {
      salonId: data.salonId,
      totalReviews: data.totalReviews ?? 0,
      averageRating: data.averageRating ?? 0.0,
      oneStarCount: data.oneStarCount ?? 0,
      twoStarCount: data.twoStarCount ?? 0,
      threeStarCount: data.threeStarCount ?? 0,
      fourStarCount: data.fourStarCount ?? 0,
      fiveStarCount: data.fiveStarCount ?? 0,
      npsScore: data.npsScore,
      lastCalculatedAt: data.lastCalculatedAt ?? new Date(),
    };

    return this.db.branchRatingSummary.upsert({
      where: { branchId },
      create: {
        branchId,
        ...payload,
      },
      update: payload,
    });
  }
}

@Injectable()
export class StaffRatingSummaryRepository implements IStaffRatingSummaryRepository {
  constructor(private readonly db: PrismaService) {}

  public async findByStaff(staffId: string): Promise<StaffRatingSummary | null> {
    return this.db.staffRatingSummary.findUnique({ where: { staffId } });
  }

  public async findBySalon(salonId: string): Promise<StaffRatingSummary[]> {
    return this.db.staffRatingSummary.findMany({ where: { salonId } });
  }

  public async create(data: CreateStaffRatingSummaryData): Promise<StaffRatingSummary> {
    return this.db.staffRatingSummary.create({
      data: {
        staffId: data.staffId,
        salonId: data.salonId,
        totalReviews: data.totalReviews ?? 0,
        averageRating: data.averageRating ?? 0.0,
        fiveStarRate: data.fiveStarRate ?? 0.0,
        lastCalculatedAt: data.lastCalculatedAt ?? new Date(),
      },
    });
  }

  public async update(
    staffId: string,
    data: Partial<CreateStaffRatingSummaryData>,
  ): Promise<StaffRatingSummary> {
    return this.db.staffRatingSummary.update({
      where: { staffId },
      data: {
        ...data,
        lastCalculatedAt: data.lastCalculatedAt ?? new Date(),
      },
    });
  }

  public async upsert(
    staffId: string,
    data: CreateStaffRatingSummaryData,
  ): Promise<StaffRatingSummary> {
    const payload = {
      salonId: data.salonId,
      totalReviews: data.totalReviews ?? 0,
      averageRating: data.averageRating ?? 0.0,
      fiveStarRate: data.fiveStarRate ?? 0.0,
      lastCalculatedAt: data.lastCalculatedAt ?? new Date(),
    };

    return this.db.staffRatingSummary.upsert({
      where: { staffId },
      create: {
        staffId,
        ...payload,
      },
      update: payload,
    });
  }
}

@Injectable()
export class ServiceRatingSummaryRepository implements IServiceRatingSummaryRepository {
  constructor(private readonly db: PrismaService) {}

  public async findByService(serviceId: string): Promise<ServiceRatingSummary | null> {
    return this.db.serviceRatingSummary.findUnique({ where: { serviceId } });
  }

  public async findBySalon(salonId: string): Promise<ServiceRatingSummary[]> {
    return this.db.serviceRatingSummary.findMany({ where: { salonId } });
  }

  public async create(data: CreateServiceRatingSummaryData): Promise<ServiceRatingSummary> {
    return this.db.serviceRatingSummary.create({
      data: {
        serviceId: data.serviceId,
        salonId: data.salonId,
        totalReviews: data.totalReviews ?? 0,
        averageRating: data.averageRating ?? 0.0,
        lastCalculatedAt: data.lastCalculatedAt ?? new Date(),
      },
    });
  }

  public async update(
    serviceId: string,
    data: Partial<CreateServiceRatingSummaryData>,
  ): Promise<ServiceRatingSummary> {
    return this.db.serviceRatingSummary.update({
      where: { serviceId },
      data: {
        ...data,
        lastCalculatedAt: data.lastCalculatedAt ?? new Date(),
      },
    });
  }

  public async upsert(
    serviceId: string,
    data: CreateServiceRatingSummaryData,
  ): Promise<ServiceRatingSummary> {
    const payload = {
      salonId: data.salonId,
      totalReviews: data.totalReviews ?? 0,
      averageRating: data.averageRating ?? 0.0,
      lastCalculatedAt: data.lastCalculatedAt ?? new Date(),
    };

    return this.db.serviceRatingSummary.upsert({
      where: { serviceId },
      create: {
        serviceId,
        ...payload,
      },
      update: payload,
    });
  }
}
