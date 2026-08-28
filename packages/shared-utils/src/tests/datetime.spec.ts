import {
  addMinutesToTime,
  doTimeRangesOverlap,
  formatDateToISTString,
  formatDuration,
  isTimeInRange,
  isWithinQuietHours,
  minutesToTimeString,
  timeStringToMinutes,
} from '../datetime/datetime.util.js';

describe('DateTime & Slot Arithmetic Utilities', () => {
  describe('timeStringToMinutes & minutesToTimeString', () => {
    it('should convert time string to minutes and back', () => {
      expect(timeStringToMinutes('00:00')).toBe(0);
      expect(timeStringToMinutes('09:30')).toBe(570);
      expect(timeStringToMinutes('14:45')).toBe(885);
      expect(timeStringToMinutes('23:59')).toBe(1439);

      expect(minutesToTimeString(0)).toBe('00:00');
      expect(minutesToTimeString(570)).toBe('09:30');
      expect(minutesToTimeString(885)).toBe('14:45');
      expect(minutesToTimeString(1439)).toBe('23:59');
    });
  });

  describe('addMinutesToTime', () => {
    it('should add minutes and wrap around 24 hours', () => {
      expect(addMinutesToTime('10:00', 45)).toBe('10:45');
      expect(addMinutesToTime('10:45', 30)).toBe('11:15');
      expect(addMinutesToTime('23:30', 45)).toBe('00:15');
    });
  });

  describe('isTimeInRange', () => {
    it('should check daytime window', () => {
      expect(isTimeInRange('14:00', '09:00', '18:00')).toBe(true);
      expect(isTimeInRange('08:59', '09:00', '18:00')).toBe(false);
      expect(isTimeInRange('18:00', '09:00', '18:00')).toBe(false);
    });

    it('should check overnight window correctly', () => {
      expect(isTimeInRange('23:30', '22:00', '06:00')).toBe(true);
      expect(isTimeInRange('02:15', '22:00', '06:00')).toBe(true);
      expect(isTimeInRange('12:00', '22:00', '06:00')).toBe(false);
    });
  });

  describe('doTimeRangesOverlap', () => {
    it('should identify overlapping time windows', () => {
      // 10:00-11:00 vs 10:30-11:30 -> overlaps
      expect(doTimeRangesOverlap('10:00', '11:00', '10:30', '11:30')).toBe(true);
      // 10:00-11:00 vs 11:00-12:00 -> contiguous, does not overlap
      expect(doTimeRangesOverlap('10:00', '11:00', '11:00', '12:00')).toBe(false);
      // 10:00-11:00 vs 12:00-13:00 -> separate, does not overlap
      expect(doTimeRangesOverlap('10:00', '11:00', '12:00', '13:00')).toBe(false);
    });
  });

  describe('formatDuration', () => {
    it('should format duration minutes to readable text', () => {
      expect(formatDuration(30)).toBe('30 mins');
      expect(formatDuration(60)).toBe('1 hr');
      expect(formatDuration(90)).toBe('1 hr 30 mins');
      expect(formatDuration(120)).toBe('2 hrs');
      expect(formatDuration(135)).toBe('2 hrs 15 mins');
    });
  });

  describe('isWithinQuietHours', () => {
    it('should check quiet hours boundaries', () => {
      expect(isWithinQuietHours('23:00', '22:00', '08:00')).toBe(true);
      expect(isWithinQuietHours('07:00', '22:00', '08:00')).toBe(true);
      expect(isWithinQuietHours('15:00', '22:00', '08:00')).toBe(false);
      expect(isWithinQuietHours('15:00', null, null)).toBe(false);
    });
  });

  describe('formatDateToISTString', () => {
    it('should format dates to YYYY-MM-DD', () => {
      const formatted = formatDateToISTString('2026-08-25T10:00:00.000Z');
      expect(formatted).toBe('2026-08-25');
    });
  });
});
