import { Injectable, Logger } from '@nestjs/common';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CustomerVisitHistoryEntity } from '../entities/customer-history.entity';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerVisitHistoryRepository } from '../repositories/customer-visit-history.repository';

@Injectable()
export class CustomerVisitService {
  private readonly logger = new Logger(CustomerVisitService.name);

  constructor(
    private readonly visitRepo: CustomerVisitHistoryRepository,
    private readonly customerRepo: CustomerProfileRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
  ) {}

  public async recordVisit(
    customerProfileId: string,
    bookingId: string,
    branchId: string,
    staffIds: string[],
    serviceIds: string[],
    totalAmount: number,
    visitDate: Date,
  ): Promise<CustomerVisitHistoryEntity> {
    const customer = await this.customerRepo.findById(customerProfileId);
    if (!customer) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Customer profile not found');
    }

    const visit = await this.transactionService.run(async (tx) => {
      await this.customerRepo.update(
        customerProfileId,
        {
          version: customer.version,
        },
        'SYSTEM',
        tx,
      );

      const record = await this.visitRepo.create(
        customerProfileId,
        bookingId,
        branchId,
        staffIds,
        serviceIds,
        totalAmount,
        visitDate,
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: '00000000-0000-0000-0000-000000000000',
        actorRole: 'SYSTEM',
        action: 'CREATE',
        entityType: 'CustomerVisitHistory',
        entityId: record.id,
        newState: { customerProfileId, bookingId, totalAmount, visitDate },
      });

      return record;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_VISITS(customerProfileId));
    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_PROFILE(customerProfileId));

    return new CustomerVisitHistoryEntity(visit);
  }

  public async getVisitHistory(customerProfileId: string): Promise<CustomerVisitHistoryEntity[]> {
    const records = await this.visitRepo.findByCustomer(customerProfileId);
    return records.map((r) => new CustomerVisitHistoryEntity(r));
  }
}
