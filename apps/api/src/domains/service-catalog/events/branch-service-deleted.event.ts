import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class BranchServiceDeletedEvent extends BaseDomainEvent<{
  branchServiceId: string;
  branchId: string;
}> {
  constructor(branchServiceId: string, branchId: string) {
    super('branch-service.deleted.v1', branchServiceId, 1, {
      branchServiceId,
      branchId,
    });
  }
}
