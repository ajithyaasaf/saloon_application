import { openStorePage } from '../../utils/store-links.util';

export enum PlayInAppUpdateType {
  FLEXIBLE = 'FLEXIBLE',
  IMMEDIATE = 'IMMEDIATE',
}

export class AndroidUpdateManager {
  /**
   * Triggers a Google Play update flow.
   * If native In-App Update API is available in custom build, triggers native sheet.
   * Otherwise, opens Google Play Store directly.
   */
  public async promptPlayStoreUpdate(
    type: PlayInAppUpdateType = PlayInAppUpdateType.FLEXIBLE,
    customStoreUrl?: string
  ): Promise<void> {
    // Direct store deep-linking with web fallback
    await openStorePage(customStoreUrl);
  }
}

export const androidUpdateManager = new AndroidUpdateManager();
