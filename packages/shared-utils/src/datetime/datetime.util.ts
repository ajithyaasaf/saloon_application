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

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Strict 12-Hour AM/PM Formatter for local "HH:mm" wall-clock strings.
 * 
 * Expected Input: Valid 24-hour time string ("HH:mm" or "H:mm", e.g. "09:00", "13:30", "00:00").
 * Output: 12-hour AM/PM string ("09:00 AM", "01:30 PM", "12:00 AM", "12:00 PM").
 * 
 * NOTE: Does NOT apply timezone shifts. "13:30" is treated as local wall-clock time.
 * Invalid, empty, or unparseable inputs return the fallback string ("—" by default).
 */
export function format12HourTime(timeStr?: string | null, fallback = '—'): string {
  if (!timeStr || typeof timeStr !== 'string') return fallback;

  const trimmed = timeStr.trim();
  const match = trimmed.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (!match) return fallback;

  const hours = parseInt(match[1]!, 10);
  const minutes = match[2]!;

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hours12.toString().padStart(2, '0')}:${minutes} ${period}`;
}

/**
 * Format a local "HH:mm" start and end time range into 12-hour AM/PM format.
 * (e.g. "09:00", "20:00" -> "09:00 AM – 08:00 PM")
 */
export function format12HourTimeRange(
  startStr?: string | null,
  endStr?: string | null,
  fallback = '—',
): string {
  const formattedStart = format12HourTime(startStr, '');
  const formattedEnd = format12HourTime(endStr, '');

  if (formattedStart && formattedEnd) {
    return `${formattedStart} – ${formattedEnd}`;
  }
  if (formattedStart) {
    return formattedStart;
  }
  if (formattedEnd) {
    return formattedEnd;
  }
  return fallback;
}

/**
 * Format a UTC Date object, ISO timestamp, or epoch into 12-hour AM/PM time in a specified timezone.
 * 
 * Uses standard Intl.DateTimeFormat (Default timezone: 'Asia/Kolkata' for Indian Standard Time).
 */
export function formatUtcTo12HourTime(
  dateInput: Date | string | number,
  timeZone = 'Asia/Kolkata',
  fallback = '—',
): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return fallback;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    // Replace non-breaking or thin spaces with regular ASCII space
    return formatter.format(d).replace(/[\u202F\u00A0]/g, ' ');
  } catch {
    return fallback;
  }
}

/**
 * Generate a list of time options for UI dropdowns (e.g. for operating hours and shift pickers).
 * 
 * Returns array of { value: "HH:mm", label: "hh:mm A" } (e.g. { value: "09:00", label: "09:00 AM" }).
 */
export function generateTimeOptions(
  stepMinutes = 30,
  startMinute = 360, // 06:00 AM
  endMinute = 1410,  // 11:30 PM
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const safeStep = Math.max(5, stepMinutes);

  for (let m = startMinute; m <= endMinute; m += safeStep) {
    const value = minutesToTimeString(m);
    const label = format12HourTime(value);
    options.push({ value, label });
  }

  return options;
}

/**
 * Get a contextual time-of-day greeting (e.g. "Good Morning", "Good Afternoon", "Good Evening")
 * evaluated in the specified timezone (default: 'Asia/Kolkata').
 */
export function getTimeOfDayGreeting(
  dateInput: Date | string | number = new Date(),
  timeZone = 'Asia/Kolkata',
): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return 'Welcome';

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(formatter.format(d), 10);
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  } catch {
    return 'Welcome';
  }
}


