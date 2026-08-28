import { FilterUtil } from '../filter.util';

describe('FilterUtil', () => {
  describe('buildDateRangeFilter() Edge Cases', () => {
    it('should build abstract BETWEEN date range condition', () => {
      const from = '2026-08-01T00:00:00.000Z';
      const to = '2026-08-31T23:59:59.999Z';
      const filter = FilterUtil.buildDateRangeFilter(from, to);

      expect(filter?.operator).toBe('BETWEEN');
      expect(filter?.gte).toEqual(new Date(from));
      expect(filter?.lte).toEqual(new Date(to));
      expect(Object.isFrozen(filter)).toBe(true);
    });

    it('should handle invalid date strings gracefully without throwing', () => {
      const filter = FilterUtil.buildDateRangeFilter('invalid-date', 'invalid-date');
      expect(filter).toBeUndefined();
    });

    it('should return undefined if both from and to are missing', () => {
      expect(FilterUtil.buildDateRangeFilter(undefined, undefined)).toBeUndefined();
    });
  });

  describe('buildEnumFilter() Edge Cases', () => {
    it('should build abstract IN set condition with deduplicated values', () => {
      const filter = FilterUtil.buildEnumFilter(['CUSTOMER', 'SALON_OWNER', 'CUSTOMER']);

      expect(filter?.operator).toBe('IN');
      expect(filter?.values).toEqual(['CUSTOMER', 'SALON_OWNER']);
      expect(Object.isFrozen(filter)).toBe(true);
      expect(Object.isFrozen(filter?.values)).toBe(true);
    });

    it('should return undefined if values array is empty or undefined', () => {
      expect(FilterUtil.buildEnumFilter([])).toBeUndefined();
      expect(FilterUtil.buildEnumFilter(undefined)).toBeUndefined();
    });
  });

  describe('buildEqualsFilter() Edge Cases', () => {
    it('should build abstract EQ equality condition', () => {
      const filter = FilterUtil.buildEqualsFilter('active');
      expect(filter).toEqual({ operator: 'EQ', value: 'active' });
      expect(Object.isFrozen(filter)).toBe(true);
    });

    it('should return undefined if value is undefined or null', () => {
      expect(FilterUtil.buildEqualsFilter(undefined)).toBeUndefined();
      expect(FilterUtil.buildEqualsFilter(null)).toBeUndefined();
    });
  });
});
