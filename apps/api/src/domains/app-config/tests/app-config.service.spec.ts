import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../app-config.service';
import { AppPlatform, UpdateMode } from '../dto/app-config.dto';

describe('AppConfigService', () => {
  let service: AppConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppConfigService],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  describe('compareSemver', () => {
    it('should correctly identify when v1 > v2', () => {
      expect(service.compareSemver('2.10.0', '2.9.0')).toBe(1);
      expect(service.compareSemver('1.0.1', '1.0.0')).toBe(1);
      expect(service.compareSemver('2.0.0', '1.9.9')).toBe(1);
    });

    it('should correctly identify when v1 < v2', () => {
      expect(service.compareSemver('2.9.0', '2.10.0')).toBe(-1);
      expect(service.compareSemver('1.0.0', '1.0.1')).toBe(-1);
      expect(service.compareSemver('0.9.0', '1.0.0')).toBe(-1);
    });

    it('should correctly identify equal versions', () => {
      expect(service.compareSemver('1.0.0', '1.0.0')).toBe(0);
      expect(service.compareSemver('2.4.1', '2.4.1')).toBe(0);
    });

    it('should handle pre-release tags and build metadata cleanly', () => {
      expect(service.compareSemver('1.0.0-beta.1', '1.0.0')).toBe(0);
      expect(service.compareSemver('1.0.1+build.123', '1.0.0')).toBe(1);
    });

    it('should handle missing or malformed versions gracefully', () => {
      expect(service.compareSemver('', '1.0.0')).toBe(0);
      expect(service.compareSemver('1.0.0', '')).toBe(0);
    });
  });

  describe('getConfig - Version Governance', () => {
    it('should return UpdateMode.NONE when client is up to date', () => {
      const result = service.getConfig({
        platform: AppPlatform.ANDROID,
        appVersion: '1.0.0',
      });

      expect(result.update.mode).toBe(UpdateMode.NONE);
      expect(result.update.storeUrl).toContain('com.saloon.customer');
      expect(result.features.newBookingFlow).toBe(true);
      expect(result.emergency.disablePayments).toBe(false);
    });

    it('should return UpdateMode.MANDATORY when client is below minimumSupportedVersion', () => {
      const result = service.getConfig({
        platform: AppPlatform.ANDROID,
        appVersion: '0.8.0', // below 1.0.0
      });

      expect(result.update.mode).toBe(UpdateMode.MANDATORY);
      expect(result.update.title).toBe('Update Required');
    });

    it('should return correct iOS store URL for iOS platform', () => {
      const result = service.getConfig({
        platform: AppPlatform.IOS,
        appVersion: '1.0.0',
      });

      expect(result.platform).toBe(AppPlatform.IOS);
      expect(result.update.storeUrl).toContain('itms-apps://apps.apple.com/app/');
    });
  });
});
