import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerStorageRedisService } from '../throttler-storage-redis.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';

describe('ThrottlerStorageRedisService', () => {
  let service: ThrottlerStorageRedisService;
  let mockRedisService: Partial<RedisService>;
  let mockPipeline: any;
  let mockClient: any;

  beforeEach(async () => {
    mockPipeline = {
      incr: jest.fn().mockReturnThis(),
      pttl: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    mockClient = {
      status: 'ready',
      pipeline: jest.fn().mockReturnValue(mockPipeline),
      pexpire: jest.fn().mockResolvedValue(1),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThrottlerStorageRedisService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<ThrottlerStorageRedisService>(ThrottlerStorageRedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('increment (normal Redis flow)', () => {
    it('should initialize TTL on first hit when pttl is -1 (new key)', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 1], // incr result: 1 hit
        [null, -1], // pttl result: no expiry yet
      ]);

      const result = await service.increment('test-key-1', 60000);

      expect(mockClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.incr).toHaveBeenCalledWith('ratelimit:test-key-1');
      expect(mockPipeline.pttl).toHaveBeenCalledWith('ratelimit:test-key-1');
      expect(mockClient.pexpire).toHaveBeenCalledWith('ratelimit:test-key-1', 60000);
      expect(result).toEqual({
        totalHits: 1,
        timeToExpire: 60, // 60000ms / 1000 = 60s
      });
    });

    it('should return updated hits and remaining TTL for existing key', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 4], // incr result: 4 hits
        [null, 45200], // pttl result: 45200ms remaining
      ]);

      const result = await service.increment('test-key-2', 60000);

      expect(mockClient.pexpire).not.toHaveBeenCalled();
      expect(result).toEqual({
        totalHits: 4,
        timeToExpire: 46, // Math.ceil(45200 / 1000) = 46s
      });
    });

    it('should throw error if pipeline result contains error', async () => {
      mockPipeline.exec.mockResolvedValue([
        [new Error('Redis INCR failed'), null],
        [null, 50000],
      ]);

      // Service should catch Redis error and fall back gracefully to in-memory degraded mode
      const result = await service.increment('test-key-error', 60000);
      expect(result.totalHits).toBe(1);
      expect(result.timeToExpire).toBe(60);
    });
  });

  describe('degraded mode (Redis outage fallback)', () => {
    it('should track hits in-memory when Redis client returns null or fails', async () => {
      (mockRedisService.getClient as jest.Mock).mockReturnValue(null);

      // Hit 1
      const hit1 = await service.increment('fallback-ip-127.0.0.1', 60000);
      expect(hit1.totalHits).toBe(1);
      expect(hit1.timeToExpire).toBeGreaterThanOrEqual(1);

      // Hit 2
      const hit2 = await service.increment('fallback-ip-127.0.0.1', 60000);
      expect(hit2.totalHits).toBe(2);
      expect(hit2.timeToExpire).toBeGreaterThanOrEqual(1);
    });

    it('should gracefully switch to in-memory fallback when pipeline throws network exception', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.increment('disconnected-key', 30000);
      expect(result.totalHits).toBe(1);
      expect(result.timeToExpire).toBe(30);
    });
  });
});
