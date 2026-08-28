import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export class CategoryCreatedEvent extends BaseDomainEvent<{ categoryId: string; name: string }> {
  constructor(categoryId: string, name: string) {
    super('category.created.v1', categoryId, 1, { categoryId, name });
  }
}
