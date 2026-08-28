import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class CategoryUpdatedEvent extends BaseDomainEvent<{ categoryId: string }> {
  constructor(categoryId: string) {
    super('category.updated.v1', categoryId, 1, { categoryId });
  }
}
