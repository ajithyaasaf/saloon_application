import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class LeaveRejectedEvent extends BaseDomainEvent<{ leaveId: string; staffId: string; approverId?: string; reason?: string }> {
  constructor(leaveId: string, staffId: string, approverId?: string, reason?: string) {
    super('leave.rejected.v1', leaveId, 1, { leaveId, staffId, approverId, reason });
  }
}
