import { Injectable, Logger } from '@nestjs/common';
import { ValidationException } from '../../common/exceptions/validation.exception';
import { QueueService } from '../queue/queue.service';
import { BaseDomainEvent, IDomainEvent } from './base/domain-event.base';
import { EventHandler, IEventBusService } from './interfaces/event-bus.interface';

/**
 * EventBusService — Provider-agnostic domain event engine.
 *
 * Thread Safety: 100% Thread-Safe.
 * Dependencies: QueueService (for publishAsync).
 *
 * GLOBAL EVENT NAMING STANDARD:
 * Format: `<aggregate>.<action>.v<version>`
 * Examples: `user.created.v1`, `booking.created.v1`, `payment.completed.v1`
 *
 * IMMUTABLE EVENT VERSIONING RULES:
 * Event versions are immutable. Breaking payload changes MUST create a new event version (e.g. `user.created.v2`).
 *
 * SUBSCRIBER ISOLATION GUARANTEE:
 * Each subscriber handler executes inside an independent try/catch block.
 * A failure in Subscriber A will NEVER prevent Subscriber B from executing.
 *
 * Architecture ref: Phase 9.2 §4.4 (EventBusService)
 */
@Injectable()
export class EventBusService implements IEventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly subscriptions = new Map<string, Set<EventHandler<any>>>();

  constructor(private readonly queueService: QueueService) {}

  /**
   * Publishes a single domain event synchronously to all registered in-memory subscribers.
   */
  public async publish<T>(event: IDomainEvent<T>): Promise<void> {
    this.validateEvent(event);

    this.logger.log(
      `[EventBus] Publishing event "${event.eventName}" v${event.version} (ID: ${event.eventId})`,
    );

    const handlers = this.subscriptions.get(event.eventName);
    if (!handlers || handlers.size === 0) {
      return;
    }

    // Subscriber Isolation: Executed in parallel with independent exception boundaries
    const handlerPromises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(event);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Handler failure';
        this.logger.error(
          `[EventBus] Subscriber failure isolated for event "${event.eventName}" (ID: ${event.eventId}): ${message}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    });

    await Promise.all(handlerPromises);
  }

  /**
   * Publishes a batch of domain events in sequence.
   */
  public async publishMany<T>(events: IDomainEvent<T>[]): Promise<void> {
    if (!Array.isArray(events) || events.length === 0) {
      return;
    }

    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Dispatches a domain event asynchronously to background queue for decoupled processing.
   */
  public async publishAsync<T>(event: IDomainEvent<T>): Promise<void> {
    this.validateEvent(event);

    this.logger.log(
      `[EventBus] Pushing async event "${event.eventName}" v${event.version} to queue`,
    );

    await this.queueService.addJob(
      'events.domain',
      `event.${event.eventName}`,
      event,
    );
  }

  /**
   * Subscribes a handler function to a domain event name.
   * Returns an unsubscribe callback function.
   */
  public subscribe<T>(eventName: string, handler: EventHandler<T>): () => void {
    if (!eventName || typeof eventName !== 'string' || eventName.trim().length === 0) {
      throw new ValidationException('Subscribed eventName must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new ValidationException('EventHandler must be a function');
    }

    if (!this.subscriptions.has(eventName)) {
      this.subscriptions.set(eventName, new Set());
    }

    const handlerSet = this.subscriptions.get(eventName)!;
    handlerSet.add(handler as EventHandler<any>);

    return () => {
      handlerSet.delete(handler as EventHandler<any>);
    };
  }

  /** Reserved Event Replay */
  public async replay(eventName: string, fromTimestamp: string): Promise<void> {
    this.logger.log(`[EventBus] Event replay requested for ${eventName} from ${fromTimestamp}`);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private validateEvent<T>(event: IDomainEvent<T>): void {
    if (!event || typeof event !== 'object') {
      throw new ValidationException('Published event must be an object');
    }
    if (!event.eventName || typeof event.eventName !== 'string' || event.eventName.trim().length === 0) {
      throw new ValidationException('Event must possess a non-empty eventName string');
    }
    if (!event.aggregateId || typeof event.aggregateId !== 'string' || event.aggregateId.trim().length === 0) {
      throw new ValidationException('Event must possess a non-empty aggregateId string');
    }
    if (typeof event.version !== 'number' || event.version <= 0 || !Number.isInteger(event.version)) {
      throw new ValidationException(`Event version must be a positive integer > 0. Received: ${event.version}`);
    }
  }
}
