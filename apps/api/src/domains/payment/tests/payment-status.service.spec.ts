import { PaymentStatus } from '@prisma/client';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { PaymentStatusService } from '../services/payment-status.service';

describe('PaymentStatusService', () => {
  let service: PaymentStatusService;

  beforeEach(() => {
    service = new PaymentStatusService();
  });

  describe('validateTransition', () => {
    it('should allow valid transition UNPAID -> PENDING', () => {
      expect(() => service.validateTransition(PaymentStatus.UNPAID, PaymentStatus.PENDING)).not.toThrow();
    });

    it('should allow valid transition PENDING -> AUTHORIZED', () => {
      expect(() => service.validateTransition(PaymentStatus.PENDING, PaymentStatus.AUTHORIZED)).not.toThrow();
    });

    it('should allow valid transition PENDING -> PAID', () => {
      expect(() => service.validateTransition(PaymentStatus.PENDING, PaymentStatus.PAID)).not.toThrow();
    });

    it('should allow valid transition PAID -> PARTIALLY_REFUNDED', () => {
      expect(() => service.validateTransition(PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED)).not.toThrow();
    });

    it('should allow valid transition PAID -> REFUNDED', () => {
      expect(() => service.validateTransition(PaymentStatus.PAID, PaymentStatus.REFUNDED)).not.toThrow();
    });

    it('should throw ValidationException on illegal transition UNPAID -> REFUNDED', () => {
      expect(() => service.validateTransition(PaymentStatus.UNPAID, PaymentStatus.REFUNDED)).toThrow(ValidationException);
    });

    it('should throw ValidationException on illegal transition CANCELLED -> PAID', () => {
      expect(() => service.validateTransition(PaymentStatus.CANCELLED, PaymentStatus.PAID)).toThrow(ValidationException);
    });
  });
});
