import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class BranchServiceUpdatedEvent extends BaseDomainEvent<{
  branchServiceId: string;
  branchId: string;
}> {
  constructor(branchServiceId: string, branchId: string) {
    super('branch-service.updated.v1', branchServiceId, 1, {
      branchServiceId,
      branchId,
    });
  }
}
