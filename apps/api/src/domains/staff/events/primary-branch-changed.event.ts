import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class PrimaryBranchChangedEvent extends BaseDomainEvent<{ staffId: string; newPrimaryBranchId: string }> {
  constructor(staffId: string, newPrimaryBranchId: string) {
    super('branch.primary-changed.v1', staffId, 1, { staffId, newPrimaryBranchId });
  }
}
