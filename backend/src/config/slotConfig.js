/**
 * PlateWise Pickup Slot Configuration Module
 * Single authoritative source for slot business rules, capacities, thresholds, and timezone calculations.
 */

export const SLOT_CONFIG = {
  // Default maximum orders per 30-minute pickup slot
  DEFAULT_SLOT_CAPACITY: 40,

  // Threshold at or below which a slot displays "Filling Fast" (20% of max capacity, e.g. <= 8 remaining when capacity is 40)
  FILLING_FAST_THRESHOLD_PERCENT: 0.20,

  // Campus canteen official operating timezone
  TIMEZONE: 'Asia/Kolkata',

  // Master definition of standard campus canteen pickup windows
  STANDARD_SLOTS: [
    {
      slot: '12:00 PM - 12:30 PM',
      start_time: '12:00:00',
      end_time: '12:30:00',
      sort_order: 1,
    },
    {
      slot: '12:30 PM - 01:00 PM',
      start_time: '12:30:00',
      end_time: '13:00:00',
      sort_order: 2,
    },
    {
      slot: '01:00 PM - 01:30 PM',
      start_time: '13:00:00',
      end_time: '13:30:00',
      sort_order: 3,
    },
    {
      slot: '01:30 PM - 02:00 PM',
      start_time: '13:30:00',
      end_time: '14:00:00',
      sort_order: 4,
    },
  ],
};

/**
 * Returns the current date in 'YYYY-MM-DD' format formatted in Asia/Kolkata timezone.
 */
export function getCurrentKolkataDate(dateObj = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SLOT_CONFIG.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(dateObj); // 'YYYY-MM-DD'
}

/**
 * Returns the current time in 'HH:mm:ss' (24-hour) format in Asia/Kolkata timezone.
 */
export function getCurrentKolkataTime(dateObj = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: SLOT_CONFIG.TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(dateObj); // 'HH:mm:ss'
}

/**
 * Validates that a string is in 'YYYY-MM-DD' format and represents a real calendar date.
 */
export function isValidCalendarDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  // Check valid day counts for month, including leap year for February
  const daysInMonth = [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

/**
 * Checks if a given calendar date ('YYYY-MM-DD') is strictly before today in Asia/Kolkata.
 */
export function isDateInPast(dateStr) {
  const today = getCurrentKolkataDate();
  return dateStr < today;
}

/**
 * Checks if a slot on a given date is in the past:
 * - If date < today -> past
 * - If date > today -> not past
 * - If date == today -> past if current time >= start_time
 */
export function isSlotInPast(startTimeStr, dateStr, now = new Date()) {
  const today = getCurrentKolkataDate(now);
  if (dateStr < today) {
    return true;
  }
  if (dateStr > today) {
    return false;
  }
  // dateStr === today
  const currentTime = getCurrentKolkataTime(now);
  return currentTime >= startTimeStr;
}

/**
 * Computes slot status based on past state and capacity availability.
 * Status values: 'past' | 'full' | 'filling_fast' | 'available'
 */
export function computeSlotStatus({ isPast, maxCapacity, bookedCount, thresholdPercent = SLOT_CONFIG.FILLING_FAST_THRESHOLD_PERCENT }) {
  if (isPast) {
    return 'past';
  }
  const remaining = Math.max(0, maxCapacity - bookedCount);
  if (remaining === 0) {
    return 'full';
  }
  const fillingFastCutoff = Math.ceil(maxCapacity * thresholdPercent);
  if (remaining <= fillingFastCutoff) {
    return 'filling_fast';
  }
  return 'available';
}
