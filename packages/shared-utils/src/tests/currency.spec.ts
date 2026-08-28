import { calculateDiscount, calculateGST, formatINR, paiseToRupees, rupeesToPaise } from '../currency/currency.util.js';

describe('Currency & Tax Utilities', () => {
  describe('formatINR', () => {
    it('should format numbers into Indian rupee currency notation', () => {
      expect(formatINR(1000)).toBe('₹1,000');
      expect(formatINR(100000)).toBe('₹1,00,000');
      expect(formatINR(1234567)).toBe('₹12,34,567');
      expect(formatINR(0)).toBe('₹0');
    });

    it('should support disabling symbol and enabling paise fraction', () => {
      expect(formatINR(1499, { showSymbol: false, showPaise: true })).toBe('1,499.00');
      expect(formatINR(1499.5, { showSymbol: true, showPaise: true })).toBe('₹1,499.50');
    });

    it('should handle negative numbers gracefully', () => {
      expect(formatINR(-500)).toBe('-₹500');
    });

    it('should handle null/undefined/NaN by returning ₹0', () => {
      expect(formatINR(NaN)).toBe('₹0');
      expect(formatINR(null as any)).toBe('₹0');
    });
  });

  describe('rupeesToPaise & paiseToRupees', () => {
    it('should convert Rupees to Paise correctly', () => {
      expect(rupeesToPaise(150)).toBe(15000);
      expect(rupeesToPaise(99.99)).toBe(9999);
      expect(rupeesToPaise(0)).toBe(0);
      expect(rupeesToPaise(-10)).toBe(0);
    });

    it('should convert Paise to Rupees correctly', () => {
      expect(paiseToRupees(15000)).toBe(150);
      expect(paiseToRupees(9999)).toBe(99.99);
      expect(paiseToRupees(0)).toBe(0);
    });
  });

  describe('calculateGST', () => {
    it('should calculate 18% GST by default and split into CGST and SGST', () => {
      const result = calculateGST(1000);
      expect(result.subtotal).toBe(1000);
      expect(result.gstRatePercent).toBe(18);
      expect(result.gstAmount).toBe(180);
      expect(result.cgstAmount).toBe(90);
      expect(result.sgstAmount).toBe(90);
      expect(result.totalAmount).toBe(1180);
    });

    it('should support custom GST rates', () => {
      const result = calculateGST(500, 5);
      expect(result.gstAmount).toBe(25);
      expect(result.cgstAmount).toBe(12.5);
      expect(result.sgstAmount).toBe(12.5);
      expect(result.totalAmount).toBe(525);
    });
  });

  describe('calculateDiscount', () => {
    it('should calculate percentage discount with optional cap', () => {
      expect(calculateDiscount(1000, 'PERCENTAGE', 20)).toBe(200);
      // Cap at 150
      expect(calculateDiscount(1000, 'PERCENTAGE', 20, 150)).toBe(150);
    });

    it('should calculate fixed amount discount capped at total amount', () => {
      expect(calculateDiscount(1000, 'FIXED_AMOUNT', 300)).toBe(300);
      expect(calculateDiscount(200, 'FIXED_AMOUNT', 300)).toBe(200);
    });

    it('should calculate free service as 100% discount', () => {
      expect(calculateDiscount(450, 'FREE_SERVICE', 0)).toBe(450);
    });

    it('should return 0 discount for cashback at checkout', () => {
      expect(calculateDiscount(1000, 'CASHBACK', 100)).toBe(0);
    });
  });
});
