/**
 * Time Constants
 *
 * Centralized time-related constants and calculations.
 * All values are in milliseconds unless otherwise noted.
 */

// ===== Base Time Units =====

/** Milliseconds in one second */
export const SECOND_MS = 1000;

/** Milliseconds in one minute */
export const MINUTE_MS = 60 * SECOND_MS;

/** Milliseconds in one hour */
export const HOUR_MS = 60 * MINUTE_MS;

/** Milliseconds in one day */
export const DAY_MS = 24 * HOUR_MS;

/** Milliseconds in one week */
export const WEEK_MS = 7 * DAY_MS;

/** Milliseconds in 30 days (approximate month) */
export const MONTH_MS = 30 * DAY_MS;

/** Milliseconds in 365 days (approximate year) */
export const YEAR_MS = 365 * DAY_MS;

// ===== Common Time Periods =====

/** 5 minutes in milliseconds */
export const FIVE_MINUTES_MS = 5 * MINUTE_MS;

/** 15 minutes in milliseconds */
export const FIFTEEN_MINUTES_MS = 15 * MINUTE_MS;

/** 30 minutes in milliseconds */
export const THIRTY_MINUTES_MS = 30 * MINUTE_MS;

/** 1 hour in milliseconds */
export const ONE_HOUR_MS = HOUR_MS;

/** 6 hours in milliseconds */
export const SIX_HOURS_MS = 6 * HOUR_MS;

/** 12 hours in milliseconds */
export const TWELVE_HOURS_MS = 12 * HOUR_MS;

/** 24 hours in milliseconds */
export const TWENTY_FOUR_HOURS_MS = DAY_MS;

/** 7 days in milliseconds */
export const SEVEN_DAYS_MS = WEEK_MS;

/** 30 days in milliseconds */
export const THIRTY_DAYS_MS = MONTH_MS;

/** 90 days in milliseconds */
export const NINETY_DAYS_MS = 90 * DAY_MS;

// ===== Timeout & Debounce Values =====

/** Short debounce delay (search inputs, etc.) */
export const DEBOUNCE_SHORT_MS = 300;

/** Medium debounce delay */
export const DEBOUNCE_MEDIUM_MS = 500;

/** Long debounce delay */
export const DEBOUNCE_LONG_MS = 1000;

/** Network request timeout */
export const NETWORK_TIMEOUT_MS = 30 * SECOND_MS;

/** Short animation duration */
export const ANIMATION_SHORT_MS = 150;

/** Medium animation duration */
export const ANIMATION_MEDIUM_MS = 300;

/** Long animation duration */
export const ANIMATION_LONG_MS = 500;

// ===== Sync & Polling Intervals =====

/** Default sync interval (5 minutes) */
export const DEFAULT_SYNC_INTERVAL_MS = FIVE_MINUTES_MS;

/** Background sync interval (15 minutes) */
export const BACKGROUND_SYNC_INTERVAL_MS = FIFTEEN_MINUTES_MS;

/** Real-time update polling interval (10 seconds) */
export const REALTIME_POLL_INTERVAL_MS = 10 * SECOND_MS;

/** Cache expiration time (1 hour) */
export const CACHE_EXPIRATION_MS = ONE_HOUR_MS;

// ===== Helper Functions =====

/**
 * Convert minutes to milliseconds
 */
export function minutesToMs(minutes: number): number {
  return minutes * MINUTE_MS;
}

/**
 * Convert hours to milliseconds
 */
export function hoursToMs(hours: number): number {
  return hours * HOUR_MS;
}

/**
 * Convert days to milliseconds
 */
export function daysToMs(days: number): number {
  return days * DAY_MS;
}

/**
 * Convert milliseconds to minutes
 */
export function msToMinutes(ms: number): number {
  return Math.floor(ms / MINUTE_MS);
}

/**
 * Convert milliseconds to hours
 */
export function msToHours(ms: number): number {
  return Math.floor(ms / HOUR_MS);
}

/**
 * Convert milliseconds to days
 */
export function msToDays(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

/**
 * Convert seconds to milliseconds
 */
export function secondsToMs(seconds: number): number {
  return seconds * SECOND_MS;
}

/**
 * Convert milliseconds to seconds
 */
export function msToSeconds(ms: number): number {
  return Math.floor(ms / SECOND_MS);
}
