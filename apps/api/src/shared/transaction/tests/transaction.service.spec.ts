import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TransactionService } from '../transaction.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let prismaServiceMock: { $transaction: jest.Mock };

  beforeEach(async () => {
    prismaServiceMock = {
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  it('should execute work callback inside Prisma transaction', async () => {
    const mockResult = { id: 'usr_123' };
    prismaServiceMock.$transaction.mockImplementation(async (cb) => {
      const mockTx = {};
      return cb(mockTx);
    });

    const work = jest.fn().mockResolvedValue(mockResult);
    const result = await service.run(work);

    expect(result).toEqual(mockResult);
    expect(work).toHaveBeenCalled();
    expect(prismaServiceMock.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 10000 });
  });

  it('should execute runReadOnly work callback identically', async () => {
    const mockResult = [{ id: 'usr_1' }, { id: 'usr_2' }];
    prismaServiceMock.$transaction.mockImplementation(async (cb) => cb({}));

    const result = await service.runReadOnly(async () => mockResult);
    expect(result).toEqual(mockResult);
  });

  it('should wrap raw errors in DatabaseException while preserving cause', async () => {
    const originalError = new Error('Prisma connection timeout');
    prismaServiceMock.$transaction.mockRejectedValue(originalError);

    try {
      await service.run(async () => {});
      fail('Should have thrown DatabaseException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(DatabaseException);
      expect(err.cause).toBe(originalError);
    }
  });
});
