/**
 * Date, Time, Slot Arithmetic, and Duration formatting utilities.
 */

/**
 * Convert 24-hour time string ("HH:mm") into total minutes from midnight (0-1439).
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  const hours = parseInt(parts[0] || '0', 10);
  const minutes = parseInt(parts[1] || '0', 10);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight (0-1439) into 24-hour time string ("HH:mm").
 */
export function minutesToTimeString(minutes: number): string {
  const safeMinutes = Math.max(0, Math.min(1439, Math.floor(minutes || 0)));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Add a given number of minutes to a "HH:mm" time string.
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const currentMinutes = timeStringToMinutes(timeStr);
  const newMinutes = (currentMinutes + minutesToAdd) % 1440;
  return minutesToTimeString(newMinutes < 0 ? newMinutes + 1440 : newMinutes);
}

/**
 * Check if a time string falls within a start and end time window.
 */
export function isTimeInRange(targetTime: string, startTime: string, endTime: string): boolean {
  const target = timeStringToMinutes(targetTime);
  const start = timeStringToMinutes(startTime);
  const end = timeStringToMinutes(endTime);

  if (start <= end) {
    return target >= start && target < end;
  }
  // Overnight window (e.g. 22:00 to 06:00)
  return target >= start || target < end;
}

/**
 * Check if two time intervals overlap.
 */
export function doTimeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const sA = timeStringToMinutes(startA);
  const eA = timeStringToMinutes(endA);
  const sB = timeStringToMinutes(startB);
  const eB = timeStringToMinutes(endB);

  return Math.max(sA, sB) < Math.min(eA, eB);
}

/**
 * Format duration in minutes to user-friendly string (e.g. 45 mins, 1 hr, 1 hr 30 mins).
 */
export function formatDuration(minutes: number): string {
  if (isNaN(minutes) || minutes <= 0) return '0 mins';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins} min${mins === 1 ? '' : 's'}`;
  if (mins === 0) return `${hours} hr${hours === 1 ? '' : 's'}`;
  return `${hours} hr${hours === 1 ? '' : 's'} ${mins} min${mins === 1 ? '' : 's'}`;
}

/**
 * Check if a time is inside a user's configured quiet hours window.
 */
export function isWithinQuietHours(
  timeStr: string,
  quietStart?: string | null,
  quietEnd?: string | null,
): boolean {
  if (!quietStart || !quietEnd) return false;
  return isTimeInRange(timeStr, quietStart, quietEnd);
}

/**
 * Format a Date object or ISO string to standard "YYYY-MM-DD" in Indian Standard Time (IST).
 */
export function formatDateToISTString(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  // IST offset is UTC+5:30 (330 minutes)
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 330 * 60000);

  const year = istDate.getFullYear();
  const month = (istDate.getMonth() + 1).toString().padStart(2, '0');
  const day = istDate.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}
