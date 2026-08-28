import { CustomerReferral, ReferralStatus } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateReferralDto } from '../../dto/customer-referral.dto';

export interface ICustomerReferralRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<CustomerReferral | null>;
  findByCustomer(referrerCustomerProfileId: string, tx?: PrismaTransaction): Promise<CustomerReferral[]>;
  create(dto: CreateReferralDto, createdByUserId: string, tx?: PrismaTransaction): Promise<CustomerReferral>;
  update(
    id: string,
    status: ReferralStatus,
    referredCustomerProfileId?: string,
    updatedByUserId?: string,
    expectedVersion?: number,
    tx?: PrismaTransaction,
  ): Promise<CustomerReferral>;
}
