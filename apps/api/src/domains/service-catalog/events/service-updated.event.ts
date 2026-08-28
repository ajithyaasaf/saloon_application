import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class ServiceUpdatedEvent extends BaseDomainEvent<{ serviceId: string }> {
  constructor(serviceId: string) {
    super('service.updated.v1', serviceId, 1, { serviceId });
  }
}
