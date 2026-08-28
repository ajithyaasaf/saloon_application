/**
 * Domain Event Names.
 * Used with @nestjs/event-emitter for in-process event communication.
 *
 * Architecture ref: Phase 5 §12.2
 */
export const EVENTS = {
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  APPOINTMENT_NO_SHOW: 'appointment.no_show',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  REVIEW_SUBMITTED: 'review.submitted',
  SALON_APPROVED: 'salon.approved',
  SALON_REJECTED: 'salon.rejected',
  SALON_SUSPENDED: 'salon.suspended',
} as const;

export type DomainEventName = (typeof EVENTS)[keyof typeof EVENTS];
