import { Platform } from 'react-native';
import { apiClient } from './api.service';
import { compareSemver } from '../utils/version.util';
import { STORE_URLS } from '../utils/store-links.util';

export enum UpdateMode {
  NONE = 'NONE',
  RECOMMENDED = 'RECOMMENDED',
  MANDATORY = 'MANDATORY',
}

export interface AppConfig {
  platform: 'android' | 'ios' | 'web';
  app: {
    minimumSupportedVersion: string;
    recommendedVersion: string;
    latestVersion: string;
  };
  update: {
    mode: UpdateMode;
    title: string;
    message: string;
    storeUrl: string;
    releaseNotesUrl?: string;
  };
  features: {
    newBookingFlow: boolean;
    walletCashback: boolean;
    homePromotions: boolean;
    chatSupport: boolean;
  };
  emergency: {
    maintenanceMode: boolean;
    maintenanceMessage?: string;
    disablePayments: boolean;
    disableBookings: boolean;
  };
  configVersion: number;
  ttlSeconds: number;
}

// Current embedded app version (derived from app.json at build time)
export const CURRENT_APP_VERSION = '1.0.0';
export const CURRENT_BUILD_NUMBER = '1';

// Default safe local configuration (Fail-closed on experimental features)
export const SAFE_DEFAULT_APP_CONFIG: AppConfig = {
  platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
  app: {
    minimumSupportedVersion: '1.0.0',
    recommendedVersion: '1.0.0',
    latestVersion: '1.0.0',
  },
  update: {
    mode: UpdateMode.NONE,
    title: 'Up to Date',
    message: 'You are running the latest version of Saloon.',
    storeUrl:
      Platform.OS === 'ios'
        ? STORE_URLS.ios.native
        : STORE_URLS.android.native,
    releaseNotesUrl: 'https://saloon.in/releases',
  },
  features: {
    newBookingFlow: true,
    walletCashback: false, // safe default
    homePromotions: true,
    chatSupport: false,   // safe default
  },
  emergency: {
    maintenanceMode: false,
    disablePayments: false,
    disableBookings: false,
  },
  configVersion: 1,
  ttlSeconds: 3600,
};

export class AppConfigService {
  private inMemoryConfig: AppConfig = { ...SAFE_DEFAULT_APP_CONFIG };
  private lastFetchedTimestamp = 0;
  private dismissedVersions: Record<string, number> = {};

  // Configurable cooldown policy for soft update reminders
  public recommendedUpdateCooldownHours = 72;

  /**
   * Fetches latest remote configuration asynchronously without blocking app rendering.
   * If network fails or times out, falls back cleanly to the safe local configuration.
   */
  public async fetchRemoteConfig(): Promise<AppConfig> {
    try {
      const response = await apiClient.get<AppConfig>('/app/config', {
        headers: {
          'x-app-platform': Platform.OS,
          'x-app-version': CURRENT_APP_VERSION,
          'x-build-number': CURRENT_BUILD_NUMBER,
        },
      });

      if (response && response.data && response.data.app) {
        this.inMemoryConfig = response.data;
        this.lastFetchedTimestamp = Date.now();
      }
    } catch {
      // Non-blocking: retain cached / safe defaults on network error
    }

    return this.inMemoryConfig;
  }

  /**
   * Returns current active configuration (in-memory / cached / safe default).
   */
  public getConfig(): AppConfig {
    return this.inMemoryConfig;
  }

  /**
   * Evaluates the update state for the current running application.
   */
  public evaluateUpdateState(): {
    mode: UpdateMode;
    title: string;
    message: string;
    storeUrl: string;
  } {
    const config = this.inMemoryConfig;
    const current = CURRENT_APP_VERSION;
    const min = config.app.minimumSupportedVersion;
    const rec = config.app.recommendedVersion;

    // 1. Mandatory Update Check
    if (compareSemver(current, min) < 0) {
      return {
        mode: UpdateMode.MANDATORY,
        title:
          config.update.mode === UpdateMode.MANDATORY && config.update.title
            ? config.update.title
            : 'Update Required',
        message:
          config.update.mode === UpdateMode.MANDATORY && config.update.message
            ? config.update.message
            : 'This version is no longer supported. Please update to continue using Saloon.',
        storeUrl: config.update.storeUrl,
      };
    }

    // 2. Recommended Update Check with Cooldown Policy
    if (compareSemver(current, rec) < 0) {
      const lastDismissedTime = this.dismissedVersions[rec];
      const cooldownMs =
        this.recommendedUpdateCooldownHours * 60 * 60 * 1000;

      // If dismissed within the cooldown window for this specific version, suppress soft prompt
      if (lastDismissedTime && Date.now() - lastDismissedTime < cooldownMs) {
        return {
          mode: UpdateMode.NONE,
          title: 'Up to Date',
          message: '',
          storeUrl: config.update.storeUrl,
        };
      }

      return {
        mode: UpdateMode.RECOMMENDED,
        title:
          config.update.mode === UpdateMode.RECOMMENDED && config.update.title
            ? config.update.title
            : 'New Update Available',
        message:
          config.update.mode === UpdateMode.RECOMMENDED && config.update.message
            ? config.update.message
            : 'A newer version is available. Update now for the best experience.',
        storeUrl: config.update.storeUrl,
      };
    }

    return {
      mode: UpdateMode.NONE,
      title: 'Up to Date',
      message: '',
      storeUrl: config.update.storeUrl,
    };
  }

  /**
   * Records user dismissal of a recommended update to enforce cooldown window.
   */
  public recordDismissal(versionTarget: string): void {
    this.dismissedVersions[versionTarget] = Date.now();
  }
}

export const appConfigService = new AppConfigService();
