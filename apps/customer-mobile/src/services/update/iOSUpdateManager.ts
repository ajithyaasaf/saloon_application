import { openStorePage } from '../../utils/store-links.util';

export class IOSUpdateManager {
  /**
   * Directs the user to the Apple App Store product page for Saloon Customer.
   */
  public async promptAppStoreUpdate(customStoreUrl?: string): Promise<void> {
    await openStorePage(customStoreUrl);
  }
}

export const iOSUpdateManager = new IOSUpdateManager();
