import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { SkipAllThrottlers } from '../common/throttler';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { RedisService } from '../infrastructure/cache/redis.service';

@ApiTags('Health')
@SkipAllThrottlers()
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health overview check' })
  @ApiResponse({ status: 200, description: 'All systems operational' })
  @ApiResponse({ status: 503, description: 'One or more systems unhealthy' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => ({
        database: {
          status: (await this.prisma.isHealthy()) ? 'up' : 'down',
        },
      }),
      async () => ({
        redis: {
          status: (await this.redis.isHealthy()) ? 'up' : 'down',
        },
      }),
    ]);
  }

  @Public()
  @Get('readiness')
  @HealthCheck()
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  @ApiResponse({ status: 200, description: 'Pod ready to serve traffic' })
  @ApiResponse({ status: 503, description: 'Pod not ready' })
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => ({
        database: {
          status: (await this.prisma.isHealthy()) ? 'up' : 'down',
        },
      }),
      async () => ({
        redis: {
          status: (await this.redis.isHealthy()) ? 'up' : 'down',
        },
      }),
    ]);
  }

  @Public()
  @Get('liveness')
  @HealthCheck()
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  @ApiResponse({ status: 200, description: 'Process alive' })
  async liveness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => Promise.resolve({ process: { status: 'up' } }),
    ]);
  }
}
