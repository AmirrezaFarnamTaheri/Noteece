// Date utility functions for safe and consistent date handling
import { logger } from '@/utils/logger';

/**
 * Formats a Unix timestamp (in seconds) to a localized date string
 * @param timestamp Unix timestamp in seconds, or undefined
 * @param options Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string or fallback text
 */
export const formatTimestamp = (
  timestamp: number | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback: string = 'No date set',
): string => {
  if (timestamp === undefined || timestamp === null) {
    return fallback;
  }

  try {
    // Convert seconds to milliseconds for JavaScript Date
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(undefined, options);
  } catch (error) {
    logger.error('Error formatting timestamp:', error as Error);
    return fallback;
  }
};

/**
 * Formats a Unix timestamp to a localized date and time string
 * @param timestamp Unix timestamp in seconds, or undefined
 * @param fallback Fallback text if timestamp is undefined
 * @returns Formatted date and time string
 */
export const formatTimestampWithTime = (timestamp: number | undefined, fallback: string = 'No date set'): string => {
  if (timestamp === undefined || timestamp === null) {
    return fallback;
  }

  try {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  } catch (error) {
    logger.error('Error formatting timestamp with time:', error as Error);
    return fallback;
  }
};

/**
 * Formats a timestamp to a relative time string (e.g., "2 days ago", "in 3 hours")
 * @param timestamp Unix timestamp in seconds, or undefined
 * @param fallback Fallback text if timestamp is undefined
 * @returns Relative time string
 */
export const formatRelativeTime = (timestamp: number | undefined, fallback: string = 'No date set'): string => {
  if (timestamp === undefined || timestamp === null) {
    return fallback;
  }

  try {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;

    return date.toLocaleDateString();
  } catch (error) {
    logger.error('Error formatting relative time:', error as Error);
    return fallback;
  }
};

/**
 * Converts a Date object to Unix timestamp in seconds
 * @param date Date object
 * @returns Unix timestamp in seconds
 */
export const dateToTimestamp = (date: Date): number => {
  return Math.floor(date.getTime() / 1000);
};

/**
 * Parses various date formats and returns a Date object
 * Handles both seconds and milliseconds timestamps
 * @param value String, number, or Date
 * @returns Date object or null if invalid
 */
export const parseDate = (value: string | number | Date | undefined): Date | null => {
  if (value === undefined || value === null) {
    return null;
  }

  try {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'number') {
      // If the number is small, assume it's in seconds; otherwise milliseconds
      const timestamp = value < 10_000_000_000 ? value * 1000 : value;
      return new Date(timestamp);
    }

    if (typeof value === 'string') {
      return new Date(value);
    }

    return null;
  } catch (error) {
    logger.error('Error parsing date:', error as Error);
    return null;
  }
};

/**
 * Checks if a timestamp is in the past
 * @param timestamp Unix timestamp in seconds
 * @returns true if the timestamp is in the past
 */
export const isOverdue = (timestamp: number | undefined): boolean => {
  if (timestamp === undefined || timestamp === null) {
    return false;
  }

  const now = Date.now() / 1000;
  return timestamp < now;
};

/**
 * Gets the start of today as a Unix timestamp in seconds
 * @returns Unix timestamp for the start of today
 */
export const getStartOfToday = (): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor(today.getTime() / 1000);
};

/**
 * Gets the end of today as a Unix timestamp in seconds
 * @returns Unix timestamp for the end of today
 */
export const getEndOfToday = (): number => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return Math.floor(today.getTime() / 1000);
};
