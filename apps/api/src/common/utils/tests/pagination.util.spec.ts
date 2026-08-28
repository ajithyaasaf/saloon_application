import { PaginationUtil } from '../pagination.util';

describe('PaginationUtil', () => {
  describe('normalizeParams() Edge Cases', () => {
    it('should handle page = 0, page < 0, limit = 0, limit > maxLimit', () => {
      expect(PaginationUtil.normalizeParams(0, 20).page).toBe(1);
      expect(PaginationUtil.normalizeParams(-10, 20).page).toBe(1);
      expect(PaginationUtil.normalizeParams(1, 0).limit).toBe(1); // min limit clamp 1
      expect(PaginationUtil.normalizeParams(1, 500).limit).toBe(100); // max limit clamp 100
    });

    it('should handle extremely large page numbers safely', () => {
      const normalized = PaginationUtil.normalizeParams(999999999, 50);
      expect(normalized.page).toBe(999999999);
      expect(normalized.limit).toBe(50);
    });

    it('should freeze normalized result object', () => {
      const normalized = PaginationUtil.normalizeParams(1, 20);
      expect(Object.isFrozen(normalized)).toBe(true);
    });
  });

  describe('getSkipTake()', () => {
    it('should calculate skip and take offset correctly', () => {
      const offset = PaginationUtil.getSkipTake({ page: 1, limit: 20 });
      expect(offset).toEqual({ skip: 0, take: 20 });

      const page3 = PaginationUtil.getSkipTake({ page: 3, limit: 15 });
      expect(page3).toEqual({ skip: 30, take: 15 });
    });
  });

  describe('buildMeta()', () => {
    it('should compute totalPages, hasNext, and hasPrevious flags correctly', () => {
      const meta = PaginationUtil.buildMeta(45, { page: 2, limit: 10 });

      expect(meta.total).toBe(45);
      expect(meta.page).toBe(2);
      expect(meta.limit).toBe(10);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrevious).toBe(true);
      expect(Object.isFrozen(meta)).toBe(true);
    });

    it('should set hasNext=false on final page', () => {
      const meta = PaginationUtil.buildMeta(45, { page: 5, limit: 10 });
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrevious).toBe(true);
    });

    it('should set hasPrevious=false on first page', () => {
      const meta = PaginationUtil.buildMeta(45, { page: 1, limit: 10 });
      expect(meta.hasPrevious).toBe(false);
      expect(meta.hasNext).toBe(true);
    });

    it('should handle zero total items correctly', () => {
      const meta = PaginationUtil.buildMeta(0, { page: 1, limit: 10 });

      expect(meta.total).toBe(0);
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrevious).toBe(false);
    });
  });

  describe('validateCursor() Reserved Helper', () => {
    it('should validate cursor string', () => {
      expect(PaginationUtil.validateCursor('eyJpZCI6MTIzfQ==')).toBe(true);
      expect(PaginationUtil.validateCursor('')).toBe(false);
      expect(PaginationUtil.validateCursor(undefined)).toBe(false);
    });
  });
});
