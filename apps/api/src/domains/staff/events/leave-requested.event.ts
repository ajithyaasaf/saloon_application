import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class LeaveRequestedEvent extends BaseDomainEvent<{ leaveId: string; staffId: string; startDate: Date; endDate: Date; leaveType: string }> {
  constructor(leaveId: string, staffId: string, startDate: Date, endDate: Date, leaveType: string) {
    super('leave.requested.v1', leaveId, 1, { leaveId, staffId, startDate, endDate, leaveType });
  }
}
