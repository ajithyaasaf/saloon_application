import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class BranchServicePriceUpdatedEvent extends BaseDomainEvent<{
  branchServiceId: string;
  branchId: string;
  oldPrice: number;
  newPrice: number;
}> {
  constructor(branchServiceId: string, branchId: string, oldPrice: number, newPrice: number) {
    super('branch-service.price-updated.v1', branchServiceId, 1, {
      branchServiceId,
      branchId,
      oldPrice,
      newPrice,
    });
  }
}
