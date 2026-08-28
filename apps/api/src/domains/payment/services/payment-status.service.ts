import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ValidationException } from '../../../common/exceptions/validation.exception';

/**
 * PaymentStatusService — State machine governance for PaymentStatus transitions.
 *
 * Architecture ref: Phase 14.0 §5.2
 */
@Injectable()
export class PaymentStatusService {
  private readonly logger = new Logger(PaymentStatusService.name);

  private readonly allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    [PaymentStatus.UNPAID]: [PaymentStatus.PENDING, PaymentStatus.CANCELLED],
    [PaymentStatus.PENDING]: [
      PaymentStatus.AUTHORIZED,
      PaymentStatus.PAID,
      PaymentStatus.FAILED,
      PaymentStatus.EXPIRED,
      PaymentStatus.CANCELLED,
    ],
    [PaymentStatus.AUTHORIZED]: [
      PaymentStatus.PAID,
      PaymentStatus.FAILED,
      PaymentStatus.EXPIRED,
    ],
    [PaymentStatus.PAID]: [
      PaymentStatus.PARTIALLY_REFUNDED,
      PaymentStatus.REFUNDED,
    ],
    [PaymentStatus.PARTIALLY_REFUNDED]: [
      PaymentStatus.REFUNDED,
    ],
    [PaymentStatus.REFUNDED]: [],
    [PaymentStatus.FAILED]: [PaymentStatus.PENDING], // Allow retry
    [PaymentStatus.CANCELLED]: [],
    [PaymentStatus.EXPIRED]: [PaymentStatus.PENDING], // Allow retry
  };

  public validateTransition(fromStatus: PaymentStatus, toStatus: PaymentStatus): void {
    if (fromStatus === toStatus) return;

    const allowed = this.allowedTransitions[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      this.logger.warn(`Illegal PaymentStatus transition from ${fromStatus} to ${toStatus}`);
      throw new ValidationException(
        `Invalid PaymentStatus transition from ${fromStatus} to ${toStatus}`,
      );
    }
  }

  public isTransitionAllowed(fromStatus: PaymentStatus, toStatus: PaymentStatus): boolean {
    if (fromStatus === toStatus) return true;
    const allowed = this.allowedTransitions[fromStatus] || [];
    return allowed.includes(toStatus);
  }
}
