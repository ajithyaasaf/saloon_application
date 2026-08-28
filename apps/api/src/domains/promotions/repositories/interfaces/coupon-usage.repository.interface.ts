import { CouponUsage, CouponUsageStatus } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import {
  CouponUsageAggregationResult,
  CreateCouponUsageData,
  SearchCouponUsageQueryDto,
  UpdateCouponUsageData,
} from '../../dto/coupon-usage.dto';

export interface ICouponUsageRepository {
  findById(id: string, salonId?: string, tx?: PrismaTransaction): Promise<CouponUsage | null>;
  findByCoupon(couponId: string, tx?: PrismaTransaction): Promise<CouponUsage[]>;
  findByCustomer(customerId: string, salonId?: string, tx?: PrismaTransaction): Promise<CouponUsage[]>;
  findByCustomerAndCoupon(customerId: string, couponId: string, tx?: PrismaTransaction): Promise<CouponUsage[]>;
  findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<CouponUsage | null>;
  findByAppointment(appointmentId: string, tx?: PrismaTransaction): Promise<CouponUsage | null>;
  findByInvoice(invoiceId: string, tx?: PrismaTransaction): Promise<CouponUsage | null>;
  findBySalon(salonId: string, status?: CouponUsageStatus, tx?: PrismaTransaction): Promise<CouponUsage[]>;
  findByBranch(branchId: string, status?: CouponUsageStatus, tx?: PrismaTransaction): Promise<CouponUsage[]>;
  findByStatus(status: CouponUsageStatus, salonId?: string, tx?: PrismaTransaction): Promise<CouponUsage[]>;
  search(query: SearchCouponUsageQueryDto, tx?: PrismaTransaction): Promise<{ data: CouponUsage[]; total: number }>;
  count(salonId?: string, status?: CouponUsageStatus, tx?: PrismaTransaction): Promise<number>;
  countCustomerUsage(customerId: string, couponId: string, statuses?: CouponUsageStatus[], tx?: PrismaTransaction): Promise<number>;
  countCouponUsage(couponId: string, statuses?: CouponUsageStatus[], tx?: PrismaTransaction): Promise<number>;
  create(data: CreateCouponUsageData, tx?: PrismaTransaction): Promise<CouponUsage>;
  update(id: string, data: UpdateCouponUsageData, tx?: PrismaTransaction): Promise<CouponUsage>;
  updateStatus(id: string, status: CouponUsageStatus, notes?: string, tx?: PrismaTransaction): Promise<CouponUsage>;
  settle(id: string, settledAt?: Date, tx?: PrismaTransaction): Promise<CouponUsage>;
  reverse(id: string, reversalReason: string, reversedAt?: Date, tx?: PrismaTransaction): Promise<CouponUsage>;
  expire(id: string, tx?: PrismaTransaction): Promise<CouponUsage>;
  aggregateUsage(couponId: string, salonId?: string, tx?: PrismaTransaction): Promise<CouponUsageAggregationResult>;
}
