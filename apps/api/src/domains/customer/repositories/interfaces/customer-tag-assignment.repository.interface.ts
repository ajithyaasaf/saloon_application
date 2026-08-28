import { CustomerTagAssignment } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface ICustomerTagAssignmentRepository {
  findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerTagAssignment[]>;
  assign(customerProfileId: string, tagId: string, assignedByUserId: string, tx?: PrismaTransaction): Promise<CustomerTagAssignment>;
  remove(customerProfileId: string, tagId: string, tx?: PrismaTransaction): Promise<boolean>;
}
