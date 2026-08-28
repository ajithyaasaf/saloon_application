import { CustomerVisitHistory } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface ICustomerVisitHistoryRepository {
  findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerVisitHistory[]>;
  create(
    customerProfileId: string,
    bookingId: string,
    branchId: string,
    staffIds: string[],
    serviceIds: string[],
    totalAmount: number,
    visitDate: Date,
    tx?: PrismaTransaction,
  ): Promise<CustomerVisitHistory>;
}
