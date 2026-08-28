import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class BranchServiceCreatedEvent extends BaseDomainEvent<{
  branchServiceId: string;
  branchId: string;
  serviceId: string;
  price: number;
}> {
  constructor(branchServiceId: string, branchId: string, serviceId: string, price: number) {
    super('branch-service.created.v1', branchServiceId, 1, {
      branchServiceId,
      branchId,
      serviceId,
      price,
    });
  }
}
