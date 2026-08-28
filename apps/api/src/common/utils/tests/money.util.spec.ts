import { ValidationException } from '../../exceptions/validation.exception';
import { MoneyUtil } from '../money.util';

describe('MoneyUtil', () => {
  describe('Integer Subunit Invariant & ValidationException', () => {
    it('should throw ValidationException when non-integer subunits are passed to toUnits', () => {
      expect(() => MoneyUtil.toUnits(12.34)).toThrow(ValidationException);
    });

    it('should throw ValidationException when non-integer subunits are passed to add', () => {
      expect(() => MoneyUtil.add(10.5, 20)).toThrow(ValidationException);
      expect(() => MoneyUtil.add(10, 20.5)).toThrow(ValidationException);
    });

    it('should throw ValidationException when non-integer subunits are passed to subtract', () => {
      expect(() => MoneyUtil.subtract(10.5, 20)).toThrow(ValidationException);
    });

    it('should throw ValidationException when non-integer subunits are passed to formatInr', () => {
      expect(() => MoneyUtil.formatInr(12.5)).toThrow(ValidationException);
    });

    it('should throw ValidationException when percentage is < 0 or > 100', () => {
      expect(() => MoneyUtil.calculatePercentage(1000, -5)).toThrow(ValidationException);
      expect(() => MoneyUtil.calculatePercentage(1000, 105)).toThrow(ValidationException);
    });

    it('should throw ValidationException for non-finite rupees in toSubunits', () => {
      expect(() => MoneyUtil.toSubunits(NaN)).toThrow(ValidationException);
      expect(() => MoneyUtil.toSubunits(Infinity)).toThrow(ValidationException);
    });
  });

  describe('Conversions & Zero/Negative Values', () => {
    it('should convert rupees to subunits correctly including zero and negative values', () => {
      expect(MoneyUtil.toSubunits(125.5)).toBe(12550);
      expect(MoneyUtil.toSubunits(0)).toBe(0);
      expect(MoneyUtil.toSubunits(-10.5)).toBe(-1050);
    });

    it('should convert subunits to units correctly', () => {
      expect(MoneyUtil.toUnits(12550)).toBe(125.5);
      expect(MoneyUtil.toUnits(0)).toBe(0);
      expect(MoneyUtil.toUnits(-1000)).toBe(-10);
    });
  });

  describe('Banker\'s Rounding (Half-Even)', () => {
    it('should round half to even integer', () => {
      expect(MoneyUtil.toSubunits(0.025)).toBe(2);
      expect(MoneyUtil.toSubunits(0.035)).toBe(4);
    });
  });

  describe('Subunit Math', () => {
    it('should add subunit amounts correctly', () => {
      expect(MoneyUtil.add(1000, 500)).toBe(1500);
      expect(MoneyUtil.add(0, 0)).toBe(0);
    });

    it('should subtract subunit amounts correctly', () => {
      expect(MoneyUtil.subtract(1000, 400)).toBe(600);
      expect(MoneyUtil.subtract(100, 200)).toBe(-100);
    });

    it('should calculate percentage using integer subunits', () => {
      expect(MoneyUtil.calculatePercentage(10000, 10)).toBe(1000);
      expect(MoneyUtil.calculatePercentage(10000, 18)).toBe(1800);
      expect(MoneyUtil.calculatePercentage(10000, 0)).toBe(0);
      expect(MoneyUtil.calculatePercentage(10000, 100)).toBe(10000);
    });
  });

  describe('Money Allocation (Remainer Distribution Guarantee)', () => {
    it('should allocate 100 Rs (10000 paise) across equal 3-way split guaranteeing sum(allocations) === totalSubunits', () => {
      const total = 10000;
      const weights = [1, 1, 1];
      const allocations = MoneyUtil.allocate(total, weights);

      const sum = allocations.reduce((acc, val) => acc + val, 0);
      expect(sum).toBe(total);
      expect(allocations).toEqual([3334, 3333, 3333]);
      expect(Object.isFrozen(allocations)).toBe(true);
    });

    it('should throw ValidationException for invalid weights array or zero total weight', () => {
      expect(() => MoneyUtil.allocate(100, [])).toThrow(ValidationException);
      expect(() => MoneyUtil.allocate(100, [0, 0])).toThrow(ValidationException);
      expect(() => MoneyUtil.allocate(100, [-1, 2])).toThrow(ValidationException);
    });
  });

  describe('Tax & Commission Breakdown', () => {
    it('should compute tax and commission split correctly', () => {
      const split = MoneyUtil.calculateTaxAndCommission(100000, 10, 18);

      expect(split.totalSubunits).toBe(100000);
      expect(split.commissionSubunits).toBe(10000);
      expect(split.taxSubunits).toBe(1800);
      expect(split.netSubunits).toBe(100000 - 10000 - 1800);
      expect(Object.isFrozen(split)).toBe(true);
    });
  });

  describe('INR Formatting', () => {
    it('should format subunits to Indian currency string', () => {
      const formatted = MoneyUtil.formatInr(125000);
      expect(formatted).toContain('1,250.00');
    });
  });
});
