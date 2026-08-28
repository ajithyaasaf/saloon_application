import {
  BranchRatingSummary,
  SalonRatingSummary,
  ServiceRatingSummary,
  StaffRatingSummary,
} from '@prisma/client';
import {
  CreateBranchRatingSummaryData,
  CreateSalonRatingSummaryData,
  CreateServiceRatingSummaryData,
  CreateStaffRatingSummaryData,
} from '../../dto/review.dto';

export interface ISalonRatingSummaryRepository {
  findBySalon(salonId: string): Promise<SalonRatingSummary | null>;
  create(data: CreateSalonRatingSummaryData): Promise<SalonRatingSummary>;
  update(salonId: string, data: Partial<CreateSalonRatingSummaryData>): Promise<SalonRatingSummary>;
  upsert(salonId: string, data: CreateSalonRatingSummaryData): Promise<SalonRatingSummary>;
}

export interface IBranchRatingSummaryRepository {
  findByBranch(branchId: string): Promise<BranchRatingSummary | null>;
  findBySalon(salonId: string): Promise<BranchRatingSummary[]>;
  create(data: CreateBranchRatingSummaryData): Promise<BranchRatingSummary>;
  update(branchId: string, data: Partial<CreateBranchRatingSummaryData>): Promise<BranchRatingSummary>;
  upsert(branchId: string, data: CreateBranchRatingSummaryData): Promise<BranchRatingSummary>;
}

export interface IStaffRatingSummaryRepository {
  findByStaff(staffId: string): Promise<StaffRatingSummary | null>;
  findBySalon(salonId: string): Promise<StaffRatingSummary[]>;
  create(data: CreateStaffRatingSummaryData): Promise<StaffRatingSummary>;
  update(staffId: string, data: Partial<CreateStaffRatingSummaryData>): Promise<StaffRatingSummary>;
  upsert(staffId: string, data: CreateStaffRatingSummaryData): Promise<StaffRatingSummary>;
}

export interface IServiceRatingSummaryRepository {
  findByService(serviceId: string): Promise<ServiceRatingSummary | null>;
  findBySalon(salonId: string): Promise<ServiceRatingSummary[]>;
  create(data: CreateServiceRatingSummaryData): Promise<ServiceRatingSummary>;
  update(serviceId: string, data: Partial<CreateServiceRatingSummaryData>): Promise<ServiceRatingSummary>;
  upsert(serviceId: string, data: CreateServiceRatingSummaryData): Promise<ServiceRatingSummary>;
}
