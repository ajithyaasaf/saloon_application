import { NumberUtil } from '../number.util';

describe('NumberUtil', () => {
  describe('isFiniteNumber()', () => {
    it('should correctly type-guard finite numbers', () => {
      expect(NumberUtil.isFiniteNumber(42)).toBe(true);
      expect(NumberUtil.isFiniteNumber(-3.14)).toBe(true);
      expect(NumberUtil.isFiniteNumber(0)).toBe(true);

      expect(NumberUtil.isFiniteNumber(NaN)).toBe(false);
      expect(NumberUtil.isFiniteNumber(Infinity)).toBe(false);
      expect(NumberUtil.isFiniteNumber('-10')).toBe(false);
      expect(NumberUtil.isFiniteNumber(null)).toBe(false);
      expect(NumberUtil.isFiniteNumber(undefined)).toBe(false);
    });
  });

  describe('roundTo()', () => {
    it('should round numbers to specified decimal places correctly', () => {
      expect(NumberUtil.roundTo(12.3456, 2)).toBe(12.35);
      expect(NumberUtil.roundTo(12.3444, 2)).toBe(12.34);
      expect(NumberUtil.roundTo(12.5, 0)).toBe(13);
    });

    it('should handle non-finite inputs gracefully', () => {
      expect(NumberUtil.roundTo(NaN, 2)).toBe(0);
      expect(NumberUtil.roundTo(Infinity, 2)).toBe(0);
    });
  });

  describe('clamp()', () => {
    it('should clamp values within min/max bounds', () => {
      expect(NumberUtil.clamp(5, 1, 10)).toBe(5);
      expect(NumberUtil.clamp(-5, 1, 10)).toBe(1);
      expect(NumberUtil.clamp(15, 1, 10)).toBe(10);
    });

    it('should return min for non-finite inputs', () => {
      expect(NumberUtil.clamp(NaN, 1, 10)).toBe(1);
    });
  });

  describe('safeParseInt()', () => {
    it('should parse strings and numbers to integers', () => {
      expect(NumberUtil.safeParseInt('42')).toBe(42);
      expect(NumberUtil.safeParseInt(' 42 ')).toBe(42);
      expect(NumberUtil.safeParseInt(42.8)).toBe(42);
    });

    it('should return defaultValue on invalid inputs', () => {
      expect(NumberUtil.safeParseInt('invalid', 10)).toBe(10);
      expect(NumberUtil.safeParseInt(null, 5)).toBe(5);
      expect(NumberUtil.safeParseInt(undefined, 0)).toBe(0);
    });
  });

  describe('formatPercentage()', () => {
    it('should format percentage string correctly', () => {
      expect(NumberUtil.formatPercentage(85.456, 1)).toBe('85.5%');
      expect(NumberUtil.formatPercentage(100, 0)).toBe('100%');
    });
  });
});
