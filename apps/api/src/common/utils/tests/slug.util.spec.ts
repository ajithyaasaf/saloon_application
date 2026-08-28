import { SlugUtil } from '../slug.util';

describe('SlugUtil', () => {
  describe('slugify()', () => {
    it('should convert salon and service titles into clean URL slugs', () => {
      expect(SlugUtil.slugify('Glamour Salon & Spa!')).toBe('glamour-salon-spa');
      expect(SlugUtil.slugify(' Hair Cut & Styling ')).toBe('hair-cut-styling');
    });

    it('should strip diacritics and accents correctly', () => {
      expect(SlugUtil.slugify('Café & Spa Décor')).toBe('cafe-spa-decor');
    });

    it('should collapse multiple spaces, hyphens, and trailing separators', () => {
      expect(SlugUtil.slugify('Salon---Name   Test---')).toBe('salon-name-test');
      expect(SlugUtil.slugify('---glamour-salon---')).toBe('glamour-salon');
    });

    it('should handle empty or non-string inputs', () => {
      expect(SlugUtil.slugify('')).toBe('');
      expect(SlugUtil.slugify(null as unknown as string)).toBe('');
    });
  });

  describe('appendSuffix()', () => {
    it('should append numeric or string suffix to base slug', () => {
      expect(SlugUtil.appendSuffix('glamour-salon', 2)).toBe('glamour-salon-2');
      expect(SlugUtil.appendSuffix('Glamour Salon!', 'branch-1')).toBe('glamour-salon-branch1');
    });
  });

  describe('isValidSlug()', () => {
    it('should return true for valid lowercase hypenated slugs', () => {
      expect(SlugUtil.isValidSlug('glamour-salon-spa')).toBe(true);
      expect(SlugUtil.isValidSlug('hair-cut-123')).toBe(true);
      expect(SlugUtil.isValidSlug('salon')).toBe(true);
    });

    it('should return false for invalid slugs (uppercase, spaces, special chars)', () => {
      expect(SlugUtil.isValidSlug('Glamour-Salon')).toBe(false);
      expect(SlugUtil.isValidSlug('salon name')).toBe(false);
      expect(SlugUtil.isValidSlug('-salon-')).toBe(false);
      expect(SlugUtil.isValidSlug('salon--name')).toBe(false);
      expect(SlugUtil.isValidSlug('')).toBe(false);
    });
  });
});
