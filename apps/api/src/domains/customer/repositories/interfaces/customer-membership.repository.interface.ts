import { CustomerMembership } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateCustomerMembershipDto, UpdateCustomerMembershipDto } from '../../dto/customer-membership.dto';

export interface ICustomerMembershipRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<CustomerMembership | null>;
  findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerMembership[]>;
  findActiveMembership(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerMembership | null>;
  create(dto: CreateCustomerMembershipDto, createdByUserId: string, tx?: PrismaTransaction): Promise<CustomerMembership>;
  update(id: string, dto: UpdateCustomerMembershipDto, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerMembership>;
  softDelete(id: string, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerMembership>;
}
