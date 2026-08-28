import { Controller, Get, Headers, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AppConfigService } from './app-config.service';
import {
  AppConfigQueryDto,
  AppConfigResponseDto,
  AppPlatform,
} from './dto/app-config.dto';

@Controller('app')
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Public()
  @Get('config')
  public getAppConfig(
    @Query() query: AppConfigQueryDto,
    @Headers('x-app-platform') headerPlatform?: string,
    @Headers('x-app-version') headerVersion?: string,
    @Headers('x-build-number') headerBuild?: string,
  ): AppConfigResponseDto {
    const platform =
      query.platform ||
      (headerPlatform?.toLowerCase() as AppPlatform) ||
      AppPlatform.ANDROID;

    const appVersion = query.appVersion || headerVersion || '1.0.0';
    const buildNumber = query.buildNumber || headerBuild || '1';

    return this.appConfigService.getConfig({
      platform,
      appVersion,
      buildNumber,
    });
  }
}
