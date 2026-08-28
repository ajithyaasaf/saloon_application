import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class BranchAssignedEvent extends BaseDomainEvent<{ staffId: string; branchId: string; isPrimary: boolean }> {
  constructor(staffId: string, branchId: string, isPrimary: boolean) {
    super('branch.assigned.v1', staffId, 1, { staffId, branchId, isPrimary });
  }
}
