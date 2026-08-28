import { PiiMaskerUtil } from '../pii-masker.util';

describe('PiiMaskerUtil', () => {
  describe('maskEmail()', () => {
    it('should mask email local part preserving first/last char and domain', () => {
      expect(PiiMaskerUtil.maskEmail('priya.sharma@example.com')).toBe('p***a@example.com');
      expect(PiiMaskerUtil.maskEmail('ab@test.com')).toBe('a*@test.com');
      expect(PiiMaskerUtil.maskEmail('invalid-email')).toBe('***@***.***');
    });
  });

  describe('maskPhone()', () => {
    it('should mask phone number preserving +91 prefix and last 4 digits', () => {
      expect(PiiMaskerUtil.maskPhone('+919876543210')).toBe('+91******3210');
      expect(PiiMaskerUtil.maskPhone('9876543210')).toBe('98****3210');
    });
  });

  describe('maskName()', () => {
    it('should mask name parts preserving first letter of each word', () => {
      expect(PiiMaskerUtil.maskName('Priya Sharma')).toBe('P**** S*****');
      expect(PiiMaskerUtil.maskName('Rahul')).toBe('R****');
    });
  });
});
