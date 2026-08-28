import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Root')
@Controller({ version: '1' })
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'API root welcome endpoint' })
  @ApiResponse({ status: 200, description: 'API status message' })
  getHello(): { message: string; version: string } {
    return {
      message: 'Welcome to Saloon Platform API',
      version: '1.0',
    };
  }
}
