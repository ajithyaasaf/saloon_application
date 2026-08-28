import { CustomerProfile, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateCustomerProfileDto, UpdateCustomerProfileDto } from '../../dto/customer-profile.dto';
import { SearchCustomerQueryDto } from '../../dto/search-customer-query.dto';

export interface ICustomerProfileRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<CustomerProfile | null>;
  findByCustomerCode(code: string, tx?: PrismaTransaction): Promise<CustomerProfile | null>;
  findByPhone(salonId: string, phone: string, tx?: PrismaTransaction): Promise<CustomerProfile | null>;
  findByEmail(salonId: string, email: string, tx?: PrismaTransaction): Promise<CustomerProfile | null>;
  findBySalon(salonId: string, tx?: PrismaTransaction): Promise<CustomerProfile[]>;
  findByBranch(branchId: string, tx?: PrismaTransaction): Promise<CustomerProfile[]>;
  findByUser(userId: string, tx?: PrismaTransaction): Promise<CustomerProfile[]>;
  search(query: SearchCustomerQueryDto, tx?: PrismaTransaction): Promise<{ data: CustomerProfile[]; total: number }>;
  count(salonId: string, tx?: PrismaTransaction): Promise<number>;
  create(dto: CreateCustomerProfileDto, customerCode: string, createdByUserId: string, tx?: PrismaTransaction): Promise<CustomerProfile>;
  update(id: string, dto: UpdateCustomerProfileDto, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerProfile>;
  softDelete(id: string, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerProfile>;
}
