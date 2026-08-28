import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PaymentAuditRepository } from '../repositories/payment-audit.repository';

describe('PaymentAuditRepository', () => {
  let repository: PaymentAuditRepository;
  let prisma: any;

  const mockAudit = {
    id: 'aud_123e4567-e89b-12d3-a456-426614174000',
    paymentId: 'pay_123e4567-e89b-12d3-a456-426614174000',
    action: 'PAYMENT_CREATED',
    actorUserId: 'usr_123e4567-e89b-12d3-a456-426614174003',
    previousState: null,
    newState: 'UNPAID',
    metadata: {},
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      paymentAudit: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentAuditRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PaymentAuditRepository>(PaymentAuditRepository);
  });

  describe('findByPayment', () => {
    it('should return audits for payment', async () => {
      prisma.paymentAudit.findMany.mockResolvedValue([mockAudit]);
      const res = await repository.findByPayment(mockAudit.paymentId);
      expect(res).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create audit log', async () => {
      prisma.paymentAudit.create.mockResolvedValue(mockAudit);
      const res = await repository.create({
        paymentId: mockAudit.paymentId,
        action: mockAudit.action,
        actorUserId: mockAudit.actorUserId,
      });
      expect(res).toEqual(mockAudit);
    });
  });
});
