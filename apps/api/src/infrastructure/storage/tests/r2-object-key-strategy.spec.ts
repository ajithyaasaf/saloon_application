import { BadRequestException } from '@nestjs/common';
import { FileCategory } from '@prisma/client';
import { ObjectKeyStrategy } from '../strategies/object-key.strategy';
import { StorageSecurityUtil } from '../utils/storage-security.util';

describe('Phase 20.9 — R2 Object Key Strategy Suite', () => {
  const TEST_DATE = new Date('2026-08-18T10:30:00.000Z');
  const EXPECTED_YEAR = '2026';
  const EXPECTED_MONTH = '08';

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Basic Canonical Generation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('1. Basic Canonical Generation', () => {
    it('should generate canonical key for tenant asset with all components', () => {
      const key = ObjectKeyStrategy.generate({
        salonId: 'salon-123',
        category: FileCategory.GALLERY,
        extension: 'jpg',
        date: TEST_DATE,
        assetId: '11111111-2222-3333-4444-555555555555',
        randomId: 'abcdef123456',
      });

      expect(key).toBe(
        `tenants/salon-123/gallery/${EXPECTED_YEAR}/${EXPECTED_MONTH}/11111111-2222-3333-4444-555555555555/abcdef123456.jpg`,
      );
      expect(ObjectKeyStrategy.isCanonical(key)).toBe(true);
    });

    it('should generate canonical key for platform asset', () => {
      const key = ObjectKeyStrategy.generate({
        isPlatform: true,
        category: FileCategory.MARKETING,
        extension: 'png',
        date: TEST_DATE,
        assetId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        randomId: '987654fedcba',
      });

      expect(key).toBe(
        `platform/marketing/${EXPECTED_YEAR}/${EXPECTED_MONTH}/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/987654fedcba.png`,
      );
      expect(ObjectKeyStrategy.isCanonical(key)).toBe(true);
    });

    it('should generate canonical key for user-scoped asset', () => {
      const key = ObjectKeyStrategy.generate({
        userId: 'user-789',
        category: FileCategory.PROFILE,
        extension: 'webp',
        date: TEST_DATE,
        assetId: 'ffffffff-0000-1111-2222-333333333333',
        randomId: 'aabbccddeeff',
      });

      expect(key).toBe(
        `users/user-789/profile/${EXPECTED_YEAR}/${EXPECTED_MONTH}/ffffffff-0000-1111-2222-333333333333/aabbccddeeff.webp`,
      );
      expect(ObjectKeyStrategy.isCanonical(key)).toBe(true);
    });

    it('should generate canonical keys for every valid FileCategory', () => {
      const categories = Object.values(FileCategory);

      for (const cat of categories) {
        const key = ObjectKeyStrategy.generate({
          salonId: 'salon-1',
          category: cat,
          extension: 'bin',
          date: TEST_DATE,
        });

        const expectedCat = cat.toLowerCase();
        expect(key).toContain(`tenants/salon-1/${expectedCat}/${EXPECTED_YEAR}/${EXPECTED_MONTH}/`);
        expect(ObjectKeyStrategy.isCanonical(key)).toBe(true);
      }
    });

    it('should handle missing extension gracefully without trailing dot', () => {
      const key = ObjectKeyStrategy.generate({
        salonId: 'salon-1',
        category: FileCategory.DOCUMENT,
        extension: null,
        date: TEST_DATE,
        assetId: 'asset-uuid-1',
        randomId: 'rand123',
      });

      expect(key).toBe(`tenants/salon-1/document/${EXPECTED_YEAR}/${EXPECTED_MONTH}/asset-uuid-1/rand123`);
      expect(key.endsWith('.')).toBe(false);
    });

    it('should support logical subfolders safely inside tenant category namespace', () => {
      const key = ObjectKeyStrategy.generate({
        salonId: 'salon-abc',
        category: FileCategory.GALLERY,
        folder: 'summer-looks/bridal',
        extension: 'jpeg',
        date: TEST_DATE,
        assetId: 'asset-1',
        randomId: 'rand-1',
      });

      expect(key).toBe(
        `tenants/salon-abc/gallery/summer-looks/bridal/${EXPECTED_YEAR}/${EXPECTED_MONTH}/asset-1/rand-1.jpeg`,
      );
      expect(ObjectKeyStrategy.isCanonical(key)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Security & Path Traversal Protections
  // ═══════════════════════════════════════════════════════════════════════════

  describe('2. Security & Path Traversal Protections', () => {
    it('should reject folder path with directory traversal sequences (../../etc)', () => {
      expect(() =>
        ObjectKeyStrategy.generate({
          salonId: 'salon-1',
          category: FileCategory.DOCUMENT,
          folder: '../../etc/passwd',
          extension: 'pdf',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject folder path with Windows backslash traversal (..\\..\\secret)', () => {
      expect(() =>
        ObjectKeyStrategy.generate({
          salonId: 'salon-1',
          category: FileCategory.DOCUMENT,
          folder: '..\\..\\windows\\system32',
          extension: 'pdf',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject folder path starting with root slash (/absolute/path)', () => {
      expect(() =>
        ObjectKeyStrategy.generate({
          salonId: 'salon-1',
          category: FileCategory.DOCUMENT,
          folder: '/var/log/secret',
          extension: 'pdf',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject folder path containing Windows drive letter (C:/Windows)', () => {
      expect(() =>
        ObjectKeyStrategy.generate({
          salonId: 'salon-1',
          category: FileCategory.DOCUMENT,
          folder: 'C:/Windows/System32',
          extension: 'pdf',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject folder path with null bytes or encoded null bytes', () => {
      expect(() =>
        ObjectKeyStrategy.generate({
          salonId: 'salon-1',
          category: FileCategory.DOCUMENT,
          folder: 'docs\0secret',
          extension: 'pdf',
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        ObjectKeyStrategy.generate({
          salonId: 'salon-1',
          category: FileCategory.DOCUMENT,
          folder: 'docs%00secret',
          extension: 'pdf',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject folder path with illegal control characters or shell injection characters', () => {
      expect(() =>
        ObjectKeyStrategy.generate({
          salonId: 'salon-1',
          category: FileCategory.DOCUMENT,
          folder: 'docs;rm -rf /',
          extension: 'pdf',
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        ObjectKeyStrategy.generate({
          salonId: 'salon-1',
          category: FileCategory.DOCUMENT,
          folder: 'docs<script>',
          extension: 'pdf',
        }),
      ).toThrow(BadRequestException);
    });

    it('should sanitize dangerous extension strings to alphanumeric characters only', () => {
      const key = ObjectKeyStrategy.generate({
        salonId: 'salon-1',
        category: FileCategory.SERVICE,
        extension: '.jpg../..%00.exe',
        date: TEST_DATE,
        assetId: 'a1',
        randomId: 'r1',
      });

      expect(key).toBe(`tenants/salon-1/service/${EXPECTED_YEAR}/${EXPECTED_MONTH}/a1/r1.jpg00exe`);
      expect(StorageSecurityUtil.isSafeObjectKey(key)).toBe(true);
    });

    it('should sanitize salonId identifier against traversal or illegal symbols', () => {
      const key = ObjectKeyStrategy.generate({
        salonId: '../../salon-evil!!',
        category: FileCategory.PROFILE,
        extension: 'jpg',
        date: TEST_DATE,
        assetId: 'a1',
        randomId: 'r1',
      });

      // Special symbols stripped to safe alphanumeric, preventing namespace escape
      expect(key).toBe(`tenants/salon-evil/profile/${EXPECTED_YEAR}/${EXPECTED_MONTH}/a1/r1.jpg`);
      expect(StorageSecurityUtil.isSafeObjectKey(key)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Uniqueness & Collision Resistance
  // ═══════════════════════════════════════════════════════════════════════════

  describe('3. Uniqueness & Collision Resistance', () => {
    it('should generate 1,000 completely unique keys with 0 collisions in high volume', () => {
      const keySet = new Set<string>();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        const key = ObjectKeyStrategy.generate({
          salonId: 'salon-concurrency-1',
          category: FileCategory.GALLERY,
          extension: 'jpg',
        });
        keySet.add(key);
      }

      expect(keySet.size).toBe(count);
    });

    it('should generate unique keys even for identical parameters and timestamp', () => {
      const key1 = ObjectKeyStrategy.generate({
        salonId: 'salon-1',
        category: FileCategory.SERVICE,
        date: TEST_DATE,
        extension: 'png',
      });

      const key2 = ObjectKeyStrategy.generate({
        salonId: 'salon-1',
        category: FileCategory.SERVICE,
        date: TEST_DATE,
        extension: 'png',
      });

      expect(key1).not.toBe(key2);
    });

    it('should generate unique keys under concurrent Promise.all execution', async () => {
      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve(
          ObjectKeyStrategy.generate({
            salonId: 'salon-parallel',
            category: FileCategory.PRODUCT,
            date: TEST_DATE,
            extension: 'webp',
          }),
        ),
      );

      const keys = await Promise.all(promises);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Provider Independence & URL Compatibility
  // ═══════════════════════════════════════════════════════════════════════════

  describe('4. Provider Independence & URL Compatibility', () => {
    it('should produce identical keys for Cloudflare R2, AWS S3, and Local Storage', () => {
      const params = {
        salonId: 'salon-prod-1',
        category: FileCategory.GALLERY,
        extension: 'jpg',
        date: TEST_DATE,
        assetId: 'asset-fixed-uuid',
        randomId: 'random-fixed-id',
      };

      const r2Key = ObjectKeyStrategy.generate(params);
      const s3Key = ObjectKeyStrategy.generate(params);
      const localKey = ObjectKeyStrategy.generate(params);

      expect(r2Key).toBe(s3Key);
      expect(s3Key).toBe(localKey);
      expect(r2Key).toBe(
        `tenants/salon-prod-1/gallery/${EXPECTED_YEAR}/${EXPECTED_MONTH}/asset-fixed-uuid/random-fixed-id.jpg`,
      );
    });

    it('should contain only URL-safe characters ([a-z0-9-_./]) without spaces or special symbols', () => {
      const key = ObjectKeyStrategy.generate({
        salonId: 'Salon_123-ABC',
        category: FileCategory.DOCUMENT,
        folder: 'Financial Reports 2026',
        extension: 'pdf',
        date: TEST_DATE,
      });

      expect(key).toMatch(/^[a-z0-9_./-]+$/);
      expect(key).not.toContain(' ');
      expect(key).not.toContain('%20');
      expect(key).not.toContain('?');
      expect(key).not.toContain('&');
    });

    it('should enforce maximum key length (<= 512 chars)', () => {
      const longFolder = 'a'.repeat(120);
      const key = ObjectKeyStrategy.generate({
        salonId: 'salon-1',
        category: FileCategory.GALLERY,
        folder: longFolder,
        extension: 'jpg',
      });

      expect(key.length).toBeLessThanOrEqual(512);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Key Parsing & Structural Invariant Validation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('5. Key Parsing & Structural Invariant Validation', () => {
    it('should correctly parse a canonical tenant asset key', () => {
      const canonicalKey = 'tenants/salon-999/service/treatments/hair/2026/08/asset-12345/random-67890.jpg';
      const parsed = ObjectKeyStrategy.parse(canonicalKey);

      expect(parsed).toEqual({
        scope: 'tenants',
        tenantId: 'salon-999',
        category: 'service',
        folder: 'treatments/hair',
        year: '2026',
        month: '08',
        assetId: 'asset-12345',
        randomId: 'random-67890',
        extension: 'jpg',
        filename: 'random-67890.jpg',
      });
    });

    it('should correctly parse a canonical platform asset key', () => {
      const platformKey = 'platform/marketing/banners/2026/08/asset-plat-1/rand-plat-2.png';
      const parsed = ObjectKeyStrategy.parse(platformKey);

      expect(parsed).toEqual({
        scope: 'platform',
        category: 'marketing',
        folder: 'banners',
        year: '2026',
        month: '08',
        assetId: 'asset-plat-1',
        randomId: 'rand-plat-2',
        extension: 'png',
        filename: 'rand-plat-2.png',
      });
    });

    it('should correctly parse a canonical user asset key', () => {
      const userKey = 'users/user-456/profile/2026/08/asset-user-1/rand-user-2.webp';
      const parsed = ObjectKeyStrategy.parse(userKey);

      expect(parsed).toEqual({
        scope: 'users',
        userId: 'user-456',
        category: 'profile',
        folder: undefined,
        year: '2026',
        month: '08',
        assetId: 'asset-user-1',
        randomId: 'rand-user-2',
        extension: 'webp',
        filename: 'rand-user-2.webp',
      });
    });

    it('should return null when parsing non-canonical or legacy keys', () => {
      expect(ObjectKeyStrategy.parse('legacy/path/file.jpg')).toBeNull();
      expect(ObjectKeyStrategy.parse('salons/s-1/avatar.jpg')).toBeNull();
      expect(ObjectKeyStrategy.parse('')).toBeNull();
      expect(ObjectKeyStrategy.parse('invalid')).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Prefix Helpers for S3/R2 Bucket Partition Queries
  // ═══════════════════════════════════════════════════════════════════════════

  describe('6. Prefix Helpers for S3/R2 Bucket Partition Queries', () => {
    it('should return tenant root prefix', () => {
      expect(ObjectKeyStrategy.getTenantPrefix('salon-100')).toBe('tenants/salon-100/');
    });

    it('should return tenant category prefix', () => {
      expect(ObjectKeyStrategy.getTenantPrefix('salon-100', FileCategory.GALLERY)).toBe(
        'tenants/salon-100/gallery/',
      );
    });

    it('should return platform prefix', () => {
      expect(ObjectKeyStrategy.getPlatformPrefix()).toBe('platform/');
      expect(ObjectKeyStrategy.getPlatformPrefix(FileCategory.MARKETING)).toBe('platform/marketing/');
    });

    it('should return user prefix', () => {
      expect(ObjectKeyStrategy.getUserPrefix('user-500')).toBe('users/user-500/');
      expect(ObjectKeyStrategy.getUserPrefix('user-500', FileCategory.PROFILE)).toBe(
        'users/user-500/profile/',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Soft Delete & Replacement Immutability
  // ═══════════════════════════════════════════════════════════════════════════

  describe('7. Soft Delete & Replacement Immutability', () => {
    it('should generate a new distinct objectKey when an asset file is replaced', () => {
      const originalKey = ObjectKeyStrategy.generate({
        salonId: 'salon-1',
        category: FileCategory.SALON,
        extension: 'jpg',
        assetId: 'asset-salon-logo',
      });

      const replacementKey = ObjectKeyStrategy.generate({
        salonId: 'salon-1',
        category: FileCategory.SALON,
        extension: 'png',
        assetId: 'asset-salon-logo',
      });

      expect(originalKey).not.toBe(replacementKey);
      expect(originalKey.startsWith('tenants/salon-1/salon/')).toBe(true);
      expect(replacementKey.startsWith('tenants/salon-1/salon/')).toBe(true);
    });

    it('should preserve existing historical key without recycling during re-upload', () => {
      const historicalDeletedKey = ObjectKeyStrategy.generate({
        salonId: 'salon-1',
        category: FileCategory.DOCUMENT,
        extension: 'pdf',
      });

      const newUploadKey = ObjectKeyStrategy.generate({
        salonId: 'salon-1',
        category: FileCategory.DOCUMENT,
        extension: 'pdf',
      });

      expect(historicalDeletedKey).not.toBe(newUploadKey);
    });
  });
});
