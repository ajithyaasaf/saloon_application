import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class StaffServiceAssignedEvent extends BaseDomainEvent<{ staffId: string; branchServiceId: string }> {
  constructor(staffId: string, branchServiceId: string) {
    super('staff-service.assigned.v1', staffId, 1, { staffId, branchServiceId });
  }
}
