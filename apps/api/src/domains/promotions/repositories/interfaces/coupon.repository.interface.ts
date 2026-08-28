import {
  Coupon,
  CouponBranchApplicability,
  CouponCategoryApplicability,
  CouponCustomerEligibility,
  CouponServiceApplicability,
  CouponStatus,
} from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import {
  CreateCouponBranchApplicabilityData,
  CreateCouponCategoryApplicabilityData,
  CreateCouponCustomerEligibilityData,
  CreateCouponData,
  CreateCouponServiceApplicabilityData,
  SearchCouponQueryDto,
  UpdateCouponData,
} from '../../dto/coupon.dto';

export interface ICouponRepository {
  findById(id: string, salonId?: string, tx?: PrismaTransaction): Promise<Coupon | null>;
  findByCode(code: string, salonId?: string, tx?: PrismaTransaction): Promise<Coupon | null>;
  findBySalon(salonId: string, status?: CouponStatus, tx?: PrismaTransaction): Promise<Coupon[]>;
  findActiveByCode(code: string, salonId?: string, checkDate?: Date, tx?: PrismaTransaction): Promise<Coupon | null>;
  findActiveBySalon(salonId?: string, checkDate?: Date, tx?: PrismaTransaction): Promise<Coupon[]>;
  findAutoApplyCoupons(salonId?: string, checkDate?: Date, tx?: PrismaTransaction): Promise<Coupon[]>;
  findByStatus(status: CouponStatus, salonId?: string, tx?: PrismaTransaction): Promise<Coupon[]>;
  search(query: SearchCouponQueryDto, tx?: PrismaTransaction): Promise<{ data: Coupon[]; total: number }>;
  count(salonId?: string, status?: CouponStatus, tx?: PrismaTransaction): Promise<number>;
  create(data: CreateCouponData, tx?: PrismaTransaction): Promise<Coupon>;
  update(id: string, data: UpdateCouponData, expectedVersion?: number, tx?: PrismaTransaction): Promise<Coupon>;
  updateStatus(id: string, status: CouponStatus, expectedVersion?: number, tx?: PrismaTransaction): Promise<Coupon>;
  incrementUsage(id: string, amount?: number, expectedVersion?: number, tx?: PrismaTransaction): Promise<Coupon>;
  decrementUsage(id: string, amount?: number, expectedVersion?: number, tx?: PrismaTransaction): Promise<Coupon>;
  softDelete(id: string, salonId?: string, tx?: PrismaTransaction): Promise<Coupon>;
  checkCodeExists(code: string, salonId?: string, excludeCouponId?: string, tx?: PrismaTransaction): Promise<boolean>;
}

export interface ICouponServiceApplicabilityRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<CouponServiceApplicability | null>;
  findByCoupon(couponId: string, tx?: PrismaTransaction): Promise<CouponServiceApplicability[]>;
  findByService(serviceId: string, tx?: PrismaTransaction): Promise<CouponServiceApplicability[]>;
  create(data: CreateCouponServiceApplicabilityData, tx?: PrismaTransaction): Promise<CouponServiceApplicability>;
  createMany(data: CreateCouponServiceApplicabilityData[], tx?: PrismaTransaction): Promise<number>;
  delete(couponId: string, serviceId: string, tx?: PrismaTransaction): Promise<CouponServiceApplicability | null>;
  deleteByCoupon(couponId: string, tx?: PrismaTransaction): Promise<number>;
}

export interface ICouponCategoryApplicabilityRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<CouponCategoryApplicability | null>;
  findByCoupon(couponId: string, tx?: PrismaTransaction): Promise<CouponCategoryApplicability[]>;
  findByCategory(categoryId: string, tx?: PrismaTransaction): Promise<CouponCategoryApplicability[]>;
  create(data: CreateCouponCategoryApplicabilityData, tx?: PrismaTransaction): Promise<CouponCategoryApplicability>;
  createMany(data: CreateCouponCategoryApplicabilityData[], tx?: PrismaTransaction): Promise<number>;
  delete(couponId: string, categoryId: string, tx?: PrismaTransaction): Promise<CouponCategoryApplicability | null>;
  deleteByCoupon(couponId: string, tx?: PrismaTransaction): Promise<number>;
}

export interface ICouponBranchApplicabilityRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<CouponBranchApplicability | null>;
  findByCoupon(couponId: string, tx?: PrismaTransaction): Promise<CouponBranchApplicability[]>;
  findByBranch(branchId: string, tx?: PrismaTransaction): Promise<CouponBranchApplicability[]>;
  create(data: CreateCouponBranchApplicabilityData, tx?: PrismaTransaction): Promise<CouponBranchApplicability>;
  createMany(data: CreateCouponBranchApplicabilityData[], tx?: PrismaTransaction): Promise<number>;
  delete(couponId: string, branchId: string, tx?: PrismaTransaction): Promise<CouponBranchApplicability | null>;
  deleteByCoupon(couponId: string, tx?: PrismaTransaction): Promise<number>;
}

export interface ICouponCustomerEligibilityRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<CouponCustomerEligibility | null>;
  findByCoupon(couponId: string, tx?: PrismaTransaction): Promise<CouponCustomerEligibility[]>;
  findByCustomer(customerId: string, tx?: PrismaTransaction): Promise<CouponCustomerEligibility[]>;
  exists(couponId: string, customerId: string, tx?: PrismaTransaction): Promise<boolean>;
  create(data: CreateCouponCustomerEligibilityData, tx?: PrismaTransaction): Promise<CouponCustomerEligibility>;
  createMany(data: CreateCouponCustomerEligibilityData[], tx?: PrismaTransaction): Promise<number>;
  delete(couponId: string, customerId: string, tx?: PrismaTransaction): Promise<CouponCustomerEligibility | null>;
  deleteByCoupon(couponId: string, tx?: PrismaTransaction): Promise<number>;
}
