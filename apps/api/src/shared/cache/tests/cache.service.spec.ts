import { Test, TestingModule } from '@nestjs/testing';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { CacheService } from '../cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let redisServiceMock: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    keys: jest.Mock;
    incr: jest.Mock;
    expire: jest.Mock;
    getClient: jest.Mock;
  };
  let redisClientMock: {
    incrby: jest.Mock;
    decrby: jest.Mock;
    exists: jest.Mock;
  };

  beforeEach(async () => {
    redisClientMock = {
      incrby: jest.fn(),
      decrby: jest.fn(),
      exists: jest.fn(),
    };

    redisServiceMock = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      getClient: jest.fn().mockReturnValue(redisClientMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: RedisService, useValue: redisServiceMock },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  describe('get() and set() Fail-Safe & Validation', () => {
    it('should retrieve cached value from Redis', async () => {
      redisServiceMock.get.mockResolvedValue({ id: 'usr_1' });

      const res = await service.get<{ id: string }>('user:profile:usr_1');
      expect(res).toEqual({ id: 'usr_1' });
      expect(redisServiceMock.get).toHaveBeenCalledWith('user:profile:usr_1');
    });

    it('should fail-safe fallback to null on Redis read errors', async () => {
      redisServiceMock.get.mockRejectedValue(new Error('Redis connection drop'));

      const res = await service.get('user:profile:usr_1');
      expect(res).toBeNull();
    });

    it('should throw ValidationException if ttlSeconds <= 0 in set()', async () => {
      await expect(service.set('key', 'val', 0)).rejects.toThrow(ValidationException);
      await expect(service.set('key', 'val', -10)).rejects.toThrow(ValidationException);
    });
  });

  describe('getOrSet() Cache-Aside Pattern', () => {
    it('should return cached data on cache hit without calling factory function', async () => {
      redisServiceMock.get.mockResolvedValue({ id: 'salon_100' });
      const factory = jest.fn();

      const result = await service.getOrSet('salon:profile:salon_100', factory);

      expect(result).toEqual({ id: 'salon_100' });
      expect(factory).not.toHaveBeenCalled();
    });

    it('should invoke factory on cache miss and store fresh result in cache', async () => {
      redisServiceMock.get.mockResolvedValue(null);
      const freshData = { id: 'salon_100', name: 'Glamour Salon' };
      const factory = jest.fn().mockResolvedValue(freshData);

      const result = await service.getOrSet('salon:profile:salon_100', factory, 3600);

      expect(result).toEqual(freshData);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(redisServiceMock.set).toHaveBeenCalledWith('salon:profile:salon_100', freshData, 3600);
    });

    it('should propagate factory exception on miss', async () => {
      redisServiceMock.get.mockResolvedValue(null);
      const factory = jest.fn().mockRejectedValue(new Error('DB fetch failed'));

      await expect(service.getOrSet('key', factory)).rejects.toThrow('DB fetch failed');
    });
  });

  describe('increment() & Validation', () => {
    it('should increment key value atomically', async () => {
      redisServiceMock.incr.mockResolvedValue(1);

      const count = await service.increment('booking:counter');
      expect(count).toBe(1);
    });

    it('should throw ValidationException on non-integer increment value', async () => {
      await expect(service.increment('key', 2.5)).rejects.toThrow(ValidationException);
    });
  });

  describe('delete() and exists()', () => {
    it('should return false for exists after delete', async () => {
      await service.delete('user:profile:usr_1');

      redisClientMock.exists.mockResolvedValue(0);
      const isPresent = await service.exists('user:profile:usr_1');
      expect(isPresent).toBe(false);
    });
  });
});
