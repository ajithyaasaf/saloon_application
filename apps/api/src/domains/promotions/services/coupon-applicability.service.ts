import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from '../../../shared/cache/cache.service';
import {
  CouponBranchApplicabilityEntity,
  CouponCategoryApplicabilityEntity,
  CouponCustomerEligibilityEntity,
  CouponServiceApplicabilityEntity,
} from '../entities/coupon.entity';
import {
  CouponBranchApplicabilityRepository,
  CouponCategoryApplicabilityRepository,
  CouponCustomerEligibilityRepository,
  CouponRepository,
  CouponServiceApplicabilityRepository,
} from '../repositories/coupon.repository';

@Injectable()
export class CouponApplicabilityService {
  constructor(
    private readonly couponRepo: CouponRepository,
    private readonly serviceAppRepo: CouponServiceApplicabilityRepository,
    private readonly categoryAppRepo: CouponCategoryApplicabilityRepository,
    private readonly branchAppRepo: CouponBranchApplicabilityRepository,
    private readonly customerEligRepo: CouponCustomerEligibilityRepository,
    private readonly cacheService: CacheService,
  ) {}

  public async setServiceApplicabilities(
    couponId: string,
    serviceIds: string[],
    salonId?: string,
  ): Promise<CouponServiceApplicabilityEntity[]> {
    await this.verifyCouponExists(couponId, salonId);

    await this.serviceAppRepo.deleteByCoupon(couponId);
    if (serviceIds.length > 0) {
      await this.serviceAppRepo.createMany(
        serviceIds.map((serviceId) => ({ couponId, serviceId })),
      );
    }

    await this.cacheService.delete(`coupon:${couponId}`);
    const results = await this.serviceAppRepo.findByCoupon(couponId);
    return results.map((r) => new CouponServiceApplicabilityEntity(r));
  }

  public async setCategoryApplicabilities(
    couponId: string,
    categoryIds: string[],
    salonId?: string,
  ): Promise<CouponCategoryApplicabilityEntity[]> {
    await this.verifyCouponExists(couponId, salonId);

    await this.categoryAppRepo.deleteByCoupon(couponId);
    if (categoryIds.length > 0) {
      await this.categoryAppRepo.createMany(
        categoryIds.map((categoryId) => ({ couponId, categoryId })),
      );
    }

    await this.cacheService.delete(`coupon:${couponId}`);
    const results = await this.categoryAppRepo.findByCoupon(couponId);
    return results.map((r) => new CouponCategoryApplicabilityEntity(r));
  }

  public async setBranchApplicabilities(
    couponId: string,
    branchIds: string[],
    salonId?: string,
  ): Promise<CouponBranchApplicabilityEntity[]> {
    await this.verifyCouponExists(couponId, salonId);

    await this.branchAppRepo.deleteByCoupon(couponId);
    if (branchIds.length > 0) {
      await this.branchAppRepo.createMany(
        branchIds.map((branchId) => ({ couponId, branchId })),
      );
    }

    await this.cacheService.delete(`coupon:${couponId}`);
    const results = await this.branchAppRepo.findByCoupon(couponId);
    return results.map((r) => new CouponBranchApplicabilityEntity(r));
  }

  public async setCustomerEligibilities(
    couponId: string,
    customerIds: string[],
    salonId?: string,
  ): Promise<CouponCustomerEligibilityEntity[]> {
    await this.verifyCouponExists(couponId, salonId);

    await this.customerEligRepo.deleteByCoupon(couponId);
    if (customerIds.length > 0) {
      await this.customerEligRepo.createMany(
        customerIds.map((customerId) => ({ couponId, customerId })),
      );
    }

    await this.cacheService.delete(`coupon:${couponId}`);
    const results = await this.customerEligRepo.findByCoupon(couponId);
    return results.map((r) => new CouponCustomerEligibilityEntity(r));
  }

  public async getApplicabilitiesForCoupon(couponId: string, salonId?: string) {
    await this.verifyCouponExists(couponId, salonId);

    const [services, categories, branches, customers] = await Promise.all([
      this.serviceAppRepo.findByCoupon(couponId),
      this.categoryAppRepo.findByCoupon(couponId),
      this.branchAppRepo.findByCoupon(couponId),
      this.customerEligRepo.findByCoupon(couponId),
    ]);

    return {
      services: services.map((s) => new CouponServiceApplicabilityEntity(s)),
      categories: categories.map((c) => new CouponCategoryApplicabilityEntity(c)),
      branches: branches.map((b) => new CouponBranchApplicabilityEntity(b)),
      customers: customers.map((c) => new CouponCustomerEligibilityEntity(c)),
    };
  }

  private async verifyCouponExists(couponId: string, salonId?: string): Promise<void> {
    const coupon = await this.couponRepo.findById(couponId, salonId);
    if (!coupon) {
      throw new NotFoundException(`Coupon with id ${couponId} not found.`);
    }
  }
}
