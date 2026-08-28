import { DateTimeUtil } from '../date-time.util';

describe('DateTimeUtil', () => {
  describe('Input Standardization & Edge Cases', () => {
    it('should parse Date objects and ISO strings identically', () => {
      const isoStr = '2026-08-06T10:30:00.000Z';
      const dateObj = new Date(isoStr);

      expect(DateTimeUtil.parseDate(isoStr)).toEqual(dateObj);
      expect(DateTimeUtil.parseDate(dateObj)).toEqual(dateObj);
    });

    it('should throw RangeError for invalid date inputs', () => {
      expect(() => DateTimeUtil.parseDate('invalid-date')).toThrow(RangeError);
      expect(() => DateTimeUtil.parseDate('2026-02-31T00:00:00Z')).toThrow(RangeError);
    });

    it('should handle leap year correctly (Feb 29)', () => {
      const leapDate = DateTimeUtil.parseDate('2024-02-29T12:00:00.000Z');
      expect(leapDate.getUTCFullYear()).toBe(2024);
      expect(leapDate.getUTCMonth()).toBe(1); // February (0-indexed)
      expect(leapDate.getUTCDate()).toBe(29);
    });
  });

  describe('isSameDay(), isPast(), and isFuture()', () => {
    it('should check if two dates are on the same UTC calendar day', () => {
      expect(DateTimeUtil.isSameDay('2026-08-06T04:00:00Z', '2026-08-06T20:00:00Z')).toBe(true);
      expect(DateTimeUtil.isSameDay('2026-08-06T04:00:00Z', '2026-08-07T04:00:00Z')).toBe(false);
    });

    it('should correctly identify past and future dates relative to UTC now', () => {
      const pastDate = '2020-01-01T00:00:00.000Z';
      const futureDate = '2030-01-01T00:00:00.000Z';

      expect(DateTimeUtil.isPast(pastDate)).toBe(true);
      expect(DateTimeUtil.isFuture(pastDate)).toBe(false);

      expect(DateTimeUtil.isFuture(futureDate)).toBe(true);
      expect(DateTimeUtil.isPast(futureDate)).toBe(false);
    });
  });

  describe('Start and End of Day (UTC)', () => {
    it('should compute start of day (00:00:00.000 UTC)', () => {
      const start = DateTimeUtil.toStartOfDay('2026-08-06T14:25:30.123Z');
      expect(start.getUTCHours()).toBe(0);
      expect(start.getUTCMinutes()).toBe(0);
      expect(start.getUTCSeconds()).toBe(0);
      expect(start.getUTCMilliseconds()).toBe(0);
    });

    it('should compute end of day (23:59:59.999 UTC)', () => {
      const end = DateTimeUtil.toEndOfDay('2026-08-06T14:25:30.123Z');
      expect(end.getUTCHours()).toBe(23);
      expect(end.getUTCMinutes()).toBe(59);
      expect(end.getUTCSeconds()).toBe(59);
      expect(end.getUTCMilliseconds()).toBe(999);
    });
  });

  describe('addMinutes()', () => {
    it('should add minutes to date and return a new Date', () => {
      const base = new Date('2026-08-06T10:00:00.000Z');
      const updated = DateTimeUtil.addMinutes(base, 45);

      expect(updated.toISOString()).toBe('2026-08-06T10:45:00.000Z');
      expect(updated).not.toBe(base);
    });
  });

  describe('areOverlapping()', () => {
    it('should return true for overlapping intervals', () => {
      const overlap = DateTimeUtil.areOverlapping(
        '2026-08-06T10:00:00.000Z',
        '2026-08-06T11:00:00.000Z',
        '2026-08-06T10:30:00.000Z',
        '2026-08-06T11:30:00.000Z',
      );
      expect(overlap).toBe(true);
    });

    it('should return false for non-overlapping intervals', () => {
      const overlap = DateTimeUtil.areOverlapping(
        '2026-08-06T10:00:00.000Z',
        '2026-08-06T11:00:00.000Z',
        '2026-08-06T11:30:00.000Z',
        '2026-08-06T12:30:00.000Z',
      );
      expect(overlap).toBe(false);
    });
  });

  describe('isWithinRange()', () => {
    it('should return true when target is within interval bounds', () => {
      const inRange = DateTimeUtil.isWithinRange(
        '2026-08-06T10:30:00.000Z',
        '2026-08-06T10:00:00.000Z',
        '2026-08-06T11:00:00.000Z',
      );
      expect(inRange).toBe(true);
    });

    it('should return false when target is outside interval bounds', () => {
      const inRange = DateTimeUtil.isWithinRange(
        '2026-08-06T11:30:00.000Z',
        '2026-08-06T10:00:00.000Z',
        '2026-08-06T11:00:00.000Z',
      );
      expect(inRange).toBe(false);
    });
  });

  describe('calculateAge()', () => {
    it('should calculate age in full years correctly', () => {
      const dob = '1995-05-15T00:00:00.000Z';
      const age = DateTimeUtil.calculateAge(dob);
      expect(age).toBeGreaterThanOrEqual(30);
    });
  });

  describe('Formatting', () => {
    it('should format date to ISO string', () => {
      const iso = DateTimeUtil.formatToIso('2026-08-06T10:00:00.000Z');
      expect(iso).toBe('2026-08-06T10:00:00.000Z');
    });

    it('should format date to display pattern string', () => {
      const display = DateTimeUtil.formatToDisplay('2026-08-06T10:00:00.000Z', 'yyyy-MM-dd');
      expect(display).toBe('2026-08-06');
    });
  });
});
