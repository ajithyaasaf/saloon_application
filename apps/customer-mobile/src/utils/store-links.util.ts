import { Linking, Platform } from 'react-native';

export const ANDROID_PACKAGE_NAME = 'com.saloon.customer';
export const IOS_APP_STORE_ID = 'com.saloon.customer';

export const STORE_URLS = {
  android: {
    native: `market://details?id=${ANDROID_PACKAGE_NAME}`,
    webFallback: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`,
  },
  ios: {
    native: `itms-apps://apps.apple.com/app/${IOS_APP_STORE_ID}`,
    webFallback: `https://apps.apple.com/app/${IOS_APP_STORE_ID}`,
  },
};

/**
 * Opens the native store page for Saloon Customer app, falling back to browser if native store fails.
 */
export async function openStorePage(customUrl?: string): Promise<void> {
  if (customUrl) {
    try {
      const canOpen = await Linking.canOpenURL(customUrl);
      if (canOpen) {
        await Linking.openURL(customUrl);
        return;
      }
    } catch {
      // fallback below
    }
  }

  if (Platform.OS === 'android') {
    try {
      const canOpenNative = await Linking.canOpenURL(STORE_URLS.android.native);
      if (canOpenNative) {
        await Linking.openURL(STORE_URLS.android.native);
        return;
      }
    } catch {
      // proceed to web fallback
    }
    await Linking.openURL(STORE_URLS.android.webFallback);
    return;
  }

  if (Platform.OS === 'ios') {
    try {
      const canOpenNative = await Linking.canOpenURL(STORE_URLS.ios.native);
      if (canOpenNative) {
        await Linking.openURL(STORE_URLS.ios.native);
        return;
      }
    } catch {
      // proceed to web fallback
    }
    await Linking.openURL(STORE_URLS.ios.webFallback);
    return;
  }

  // Web fallback
  if (typeof window !== 'undefined') {
    window.open('https://saloon.in', '_blank');
  }
}
