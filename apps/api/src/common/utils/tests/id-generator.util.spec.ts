import { IdGeneratorUtil } from '../id-generator.util';

describe('IdGeneratorUtil', () => {
  describe('generatePrefixedId()', () => {
    it('should generate prefixed ID string with correct format', () => {
      const id = IdGeneratorUtil.generatePrefixedId('test', 16);
      expect(id.startsWith('test_')).toBe(true);
      expect(id).toHaveLength(5 + 16);
    });
  });

  describe('Domain Prefixed IDs', () => {
    it('should generate salon, user, booking, payment, and invoice IDs with expected prefixes', () => {
      expect(IdGeneratorUtil.generateSalonId().startsWith('sal_')).toBe(true);
      expect(IdGeneratorUtil.generateUserId().startsWith('usr_')).toBe(true);
      expect(IdGeneratorUtil.generateBookingId().startsWith('bkg_')).toBe(true);
      expect(IdGeneratorUtil.generatePaymentId().startsWith('pay_')).toBe(true);
      expect(IdGeneratorUtil.generateInvoiceId().startsWith('inv_')).toBe(true);
    });
  });

  describe('generateUuid()', () => {
    it('should generate valid UUID v4', () => {
      const uuid = IdGeneratorUtil.generateUuid();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });
});
