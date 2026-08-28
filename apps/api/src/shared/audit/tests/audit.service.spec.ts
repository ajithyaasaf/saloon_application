import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../audit.service';
import { CreateAuditLogDto } from '../dto/create-audit-log.dto';

describe('AuditService', () => {
  let service: AuditService;
  let prismaMock: {
    auditLog: {
      create: jest.Mock;
      createMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      auditLog: {
        create: jest.fn(),
        createMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  const sampleEntry: CreateAuditLogDto = {
    action: 'UPDATE',
    entityType: 'User',
    entityId: 'usr_123',
    actorId: 'c9bf9e57-1685-4c89-bafb-ff5af830be8a',
    actorRole: 'SUPER_ADMIN',
    previousState: { role: 'CUSTOMER' },
    newState: { role: 'SALON_OWNER' },
  };

  describe('log()', () => {
    it('should create a single audit log entry', async () => {
      prismaMock.auditLog.create.mockResolvedValue({ id: 'aud_1' });

      await service.log(sampleEntry);

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPDATE',
          entityType: 'User',
          entityId: 'usr_123',
          whoId: 'c9bf9e57-1685-4c89-bafb-ff5af830be8a',
          role: 'SUPER_ADMIN',
        }),
      });
    });

    it('should throw DatabaseException when creation fails', async () => {
      prismaMock.auditLog.create.mockRejectedValue(new Error('DB write failed'));

      await expect(service.log(sampleEntry)).rejects.toThrow(DatabaseException);
    });
  });

  describe('logInTransaction()', () => {
    it('should create audit log using active transaction client', async () => {
      const txMock = { auditLog: { create: jest.fn().mockResolvedValue({ id: 'aud_tx_1' }) } };

      await service.logInTransaction(txMock as any, sampleEntry);

      expect(txMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPDATE',
          entityId: 'usr_123',
        }),
      });
    });
  });

  describe('logMany()', () => {
    it('should batch create audit log entries', async () => {
      prismaMock.auditLog.createMany.mockResolvedValue({ count: 2 });

      await service.logMany([sampleEntry, sampleEntry]);

      expect(prismaMock.auditLog.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ action: 'UPDATE' }),
        ]),
      });
    });

    it('should return early without database call if entries array is empty', async () => {
      await service.logMany([]);
      expect(prismaMock.auditLog.createMany).not.toHaveBeenCalled();
    });
  });
});
