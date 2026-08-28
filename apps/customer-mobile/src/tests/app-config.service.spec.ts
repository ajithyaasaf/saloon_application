import {
  AppConfigService,
  SAFE_DEFAULT_APP_CONFIG,
  UpdateMode,
} from '../services/app-config.service';

describe('AppConfigService (Mobile Client)', () => {
  let service: AppConfigService;

  beforeEach(() => {
    service = new AppConfigService();
  });

  it('should initialize with safe fail-closed local defaults', () => {
    const config = service.getConfig();
    expect(config.features.newBookingFlow).toBe(true);
    expect(config.features.walletCashback).toBe(false); // fail-closed
    expect(config.emergency.disablePayments).toBe(false);
    expect(config.emergency.maintenanceMode).toBe(false);
  });

  it('should evaluate UpdateMode.NONE when current version matches minimum and recommended', () => {
    const evaluation = service.evaluateUpdateState();
    expect(evaluation.mode).toBe(UpdateMode.NONE);
  });

  it('should evaluate UpdateMode.RECOMMENDED when recommendedVersion > currentVersion', () => {
    // Simulate remote config having a newer recommended version
    (service as any).inMemoryConfig = {
      ...SAFE_DEFAULT_APP_CONFIG,
      app: {
        minimumSupportedVersion: '1.0.0',
        recommendedVersion: '1.2.0',
        latestVersion: '1.2.0',
      },
    };

    const evaluation = service.evaluateUpdateState();
    expect(evaluation.mode).toBe(UpdateMode.RECOMMENDED);
    expect(evaluation.title).toBe('New Update Available');
  });

  it('should respect dismissal cooldown for recommended updates', () => {
    (service as any).inMemoryConfig = {
      ...SAFE_DEFAULT_APP_CONFIG,
      app: {
        minimumSupportedVersion: '1.0.0',
        recommendedVersion: '1.2.0',
        latestVersion: '1.2.0',
      },
    };

    // User dismisses version 1.2.0
    service.recordDismissal('1.2.0');

    // Immediately evaluating again within the cooldown window should return NONE
    const evaluation = service.evaluateUpdateState();
    expect(evaluation.mode).toBe(UpdateMode.NONE);
  });

  it('should evaluate UpdateMode.MANDATORY when currentVersion < minimumSupportedVersion', () => {
    (service as any).inMemoryConfig = {
      ...SAFE_DEFAULT_APP_CONFIG,
      app: {
        minimumSupportedVersion: '2.0.0', // current is 1.0.0
        recommendedVersion: '2.0.0',
        latestVersion: '2.0.0',
      },
    };

    const evaluation = service.evaluateUpdateState();
    expect(evaluation.mode).toBe(UpdateMode.MANDATORY);
    expect(evaluation.title).toBe('Update Required');
  });
});
