import { ImageSourcePropType } from 'react-native';
import { SalonDto } from '@saloon/shared-types';

export const SALON_FALLBACK_IMAGES: ImageSourcePropType[] = [
  require('../../assets/salons/salon-1.png'),
  require('../../assets/salons/salon-2.png'),
  require('../../assets/salons/salon-3.png'),
  require('../../assets/salons/salon-4.png'),
  require('../../assets/salons/salon-5.png'),
  require('../../assets/salons/salon-6.png'),
];

/**
 * Production-Ready Image Resolver:
 * 1. Checks if the Salon has a real Cloud CDN URL (Cloudflare R2 / AWS S3 / Cloudinary).
 * 2. If a remote URL exists, returns { uri: remoteUrl } for cloud streaming.
 * 3. If no remote URL is present (e.g. fresh salon, development seed data, or offline),
 *    gracefully falls back to one of the deterministic bundled salon photographs.
 */
export function getSalonCoverImage(
  input?: SalonDto | string | number | null,
): ImageSourcePropType {
  if (!input) {
    return SALON_FALLBACK_IMAGES[0];
  }

  // 1. If a Salon object is passed, check for real cloud CDN URLs
  if (typeof input === 'object') {
    const remoteUrl =
      (input as any).coverImageUrl ||
      (input as any).bannerUrl ||
      input.logoUrl;

    if (remoteUrl && typeof remoteUrl === 'string' && (remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://'))) {
      return { uri: remoteUrl };
    }

    // Use salon ID or name as deterministic hash for fallback
    return getFallbackByIndex(input.id || input.name || 0);
  }

  // 2. If a direct URL string was passed
  if (typeof input === 'string') {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return { uri: input };
    }
    return getFallbackByIndex(input);
  }

  // 3. If a numeric index was passed
  return getFallbackByIndex(input);
}

function getFallbackByIndex(key: string | number): ImageSourcePropType {
  if (typeof key === 'number') {
    return SALON_FALLBACK_IMAGES[Math.abs(key) % SALON_FALLBACK_IMAGES.length];
  }
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return SALON_FALLBACK_IMAGES[hash % SALON_FALLBACK_IMAGES.length];
}

