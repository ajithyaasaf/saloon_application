import { Injectable, Logger } from '@nestjs/common';
import {
  AppConfigQueryDto,
  AppConfigResponseDto,
  AppPlatform,
  UpdateMode,
} from './dto/app-config.dto';

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  // Current production governance policies
  private readonly configVersion = 1;
  private readonly ttlSeconds = 3600; // 1 hour client cache recommendation

  private readonly androidPolicy = {
    minimumSupportedVersion: '1.0.0',
    recommendedVersion: '1.0.0',
    latestVersion: '1.0.0',
    packageId: 'com.saloon.customer',
  };

  private readonly iosPolicy = {
    minimumSupportedVersion: '1.0.0',
    recommendedVersion: '1.0.0',
    latestVersion: '1.0.0',
    appStoreId: 'com.saloon.customer',
  };

  /**
   * Compares two semantic version strings (e.g. "1.2.0" vs "1.10.0").
   * Returns:
   *   1 if v1 > v2
   *  -1 if v1 < v2
   *   0 if v1 === v2
   */
  public compareSemver(v1: string, v2: string): number {
    if (!v1 || !v2) return 0;

    const parse = (v: string): number[] => {
      const clean = v.split('-')[0].split('+')[0]; // strip pre-release or build metadata
      const parts = clean.split('.').map((p) => {
        const num = parseInt(p, 10);
        return isNaN(num) ? 0 : num;
      });
      while (parts.length < 3) parts.push(0);
      return parts.slice(0, 3);
    };

    const p1 = parse(v1);
    const p2 = parse(v2);

    for (let i = 0; i < 3; i++) {
      if (p1[i] > p2[i]) return 1;
      if (p1[i] < p2[i]) return -1;
    }
    return 0;
  }

  /**
   * Generates application configuration, evaluating version policy against client version.
   */
  public getConfig(query: AppConfigQueryDto): AppConfigResponseDto {
    const platform = query.platform || AppPlatform.ANDROID;
    const clientVersion = query.appVersion || '1.0.0';

    const policy =
      platform === AppPlatform.IOS ? this.iosPolicy : this.androidPolicy;

    let mode = UpdateMode.NONE;
    let title = 'Up to Date';
    let message = 'You are running the latest version of Saloon.';

    // 1. Mandatory Update Check: Client version < minimumSupportedVersion
    if (this.compareSemver(clientVersion, policy.minimumSupportedVersion) < 0) {
      mode = UpdateMode.MANDATORY;
      title = 'Update Required';
      message =
        'This version is no longer supported. Please update to continue using Saloon.';
    }
    // 2. Recommended Update Check: minimumSupportedVersion <= Client version < recommendedVersion
    else if (
      this.compareSemver(clientVersion, policy.recommendedVersion) < 0
    ) {
      mode = UpdateMode.RECOMMENDED;
      title = 'New Update Available';
      message =
        'A newer version with enhancements and bug fixes is available. Update now for the best experience.';
    }

    const storeUrl =
      platform === AppPlatform.IOS
        ? `itms-apps://apps.apple.com/app/${this.iosPolicy.appStoreId}`
        : `market://details?id=${this.androidPolicy.packageId}`;

    return {
      platform,
      app: {
        minimumSupportedVersion: policy.minimumSupportedVersion,
        recommendedVersion: policy.recommendedVersion,
        latestVersion: policy.latestVersion,
      },
      update: {
        mode,
        title,
        message,
        storeUrl,
        releaseNotesUrl: 'https://saloon.in/releases',
      },
      features: {
        newBookingFlow: true,
        walletCashback: true,
        homePromotions: true,
        chatSupport: false,
      },
      emergency: {
        maintenanceMode: false,
        maintenanceMessage:
          'Saloon is currently undergoing scheduled maintenance. Please check back shortly.',
        disablePayments: false,
        disableBookings: false,
      },
      configVersion: this.configVersion,
      ttlSeconds: this.ttlSeconds,
    };
  }
}
