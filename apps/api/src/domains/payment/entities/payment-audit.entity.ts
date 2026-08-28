export class PaymentAuditEntity {
  id: string;
  paymentId: string;
  action: string;
  actorUserId: string;
  previousState?: string | null;
  newState?: string | null;
  metadata?: any;
  createdAt: Date;

  constructor(partial: Partial<PaymentAuditEntity>) {
    Object.assign(this, partial);
  }
}
