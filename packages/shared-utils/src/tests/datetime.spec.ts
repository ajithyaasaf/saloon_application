import {
  addMinutesToTime,
  doTimeRangesOverlap,
  formatDateToISTString,
  formatDuration,
  format12HourTime,
  format12HourTimeRange,
  formatUtcTo12HourTime,
  generateTimeOptions,
  getTimeOfDayGreeting,
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
    it('should format dates to YYYY-MM-DD in Asia/Kolkata timezone', () => {
      const formatted = formatDateToISTString('2026-08-25T10:00:00.000Z');
      expect(formatted).toBe('2026-08-25');
    });
  });

  describe('format12HourTime (Strict Local Wall-Clock Contract)', () => {
    it('should correctly format standard 24-hour time strings to 12-hour AM/PM', () => {
      expect(format12HourTime('00:00')).toBe('12:00 AM');
      expect(format12HourTime('00:30')).toBe('12:30 AM');
      expect(format12HourTime('09:00')).toBe('09:00 AM');
      expect(format12HourTime('9:05')).toBe('09:05 AM');
      expect(format12HourTime('12:00')).toBe('12:00 PM');
      expect(format12HourTime('12:45')).toBe('12:45 PM');
      expect(format12HourTime('13:30')).toBe('01:30 PM');
      expect(format12HourTime('20:00')).toBe('08:00 PM');
      expect(format12HourTime('23:59')).toBe('11:59 PM');
    });

    it('should return fallback for invalid, empty, or already formatted inputs', () => {
      expect(format12HourTime('')).toBe('—');
      expect(format12HourTime(null)).toBe('—');
      expect(format12HourTime(undefined)).toBe('—');
      expect(format12HourTime('invalid')).toBe('—');
      expect(format12HourTime('24:00')).toBe('—');
      expect(format12HourTime('25:99')).toBe('—');
      expect(format12HourTime('10:00 AM')).toBe('—'); // Strict contract rejection
      expect(format12HourTime(null, 'N/A')).toBe('N/A');
    });
  });

  describe('format12HourTimeRange', () => {
    it('should format ranges of 24-hour time strings', () => {
      expect(format12HourTimeRange('09:00', '20:00')).toBe('09:00 AM – 08:00 PM');
      expect(format12HourTimeRange('13:00', '14:00')).toBe('01:00 PM – 02:00 PM');
      expect(format12HourTimeRange('09:00', null)).toBe('09:00 AM');
      expect(format12HourTimeRange(null, '20:00')).toBe('08:00 PM');
      expect(format12HourTimeRange(null, null)).toBe('—');
    });
  });

  describe('formatUtcTo12HourTime (Timezone-Aware UTC Formatter)', () => {
    it('should format UTC Date / ISO strings into Asia/Kolkata IST time', () => {
      // 03:30 UTC is 09:00 IST (UTC + 5:30)
      expect(formatUtcTo12HourTime('2026-08-28T03:30:00.000Z', 'Asia/Kolkata')).toBe('09:00 AM');
      // 14:30 UTC is 20:00 IST (08:00 PM)
      expect(formatUtcTo12HourTime('2026-08-28T14:30:00.000Z', 'Asia/Kolkata')).toBe('08:00 PM');
      // 18:30 UTC is 00:00 IST next day (12:00 AM)
      expect(formatUtcTo12HourTime('2026-08-28T18:30:00.000Z', 'Asia/Kolkata')).toBe('12:00 AM');
    });

    it('should return fallback for invalid date inputs', () => {
      expect(formatUtcTo12HourTime('invalid-date')).toBe('—');
    });
  });

  describe('generateTimeOptions', () => {
    it('should generate 30-minute interval options with 12-hour labels', () => {
      const options = generateTimeOptions(30, 540, 660); // 09:00 to 11:00
      expect(options).toEqual([
        { value: '09:00', label: '09:00 AM' },
        { value: '09:30', label: '09:30 AM' },
        { value: '10:00', label: '10:00 AM' },
        { value: '10:30', label: '10:30 AM' },
        { value: '11:00', label: '11:00 AM' },
      ]);
    });
  });

  describe('getTimeOfDayGreeting', () => {
    it('should return contextual greeting based on IST time', () => {
      // 03:30 UTC is 09:00 AM IST -> Good Morning
      expect(getTimeOfDayGreeting('2026-08-28T03:30:00.000Z', 'Asia/Kolkata')).toBe('Good Morning');
      // 08:30 UTC is 02:00 PM IST -> Good Afternoon
      expect(getTimeOfDayGreeting('2026-08-28T08:30:00.000Z', 'Asia/Kolkata')).toBe('Good Afternoon');
      // 14:30 UTC is 08:00 PM IST -> Good Evening
      expect(getTimeOfDayGreeting('2026-08-28T14:30:00.000Z', 'Asia/Kolkata')).toBe('Good Evening');
    });
  });
});

