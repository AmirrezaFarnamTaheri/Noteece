import { logger } from '@/utils/logger';

// Re-export specific formatters from dateUtils
export { formatTimestamp, formatRelativeTime } from './dateUtils';

/**
 * Formats a number of bytes into a human-readable string (e.g., 2.5 MB)
 */
export const formatBytesLocal = (bytes: number | undefined): string => {
  if (bytes === undefined || bytes === null) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Formats a Date object or timestamp string to a localized date string.
 * This is an alias/wrapper for broader usage.
 */
export const formatDateLocal = (date: string | Date | number | undefined): string => {
  if (!date) return 'No date';
  try {
    const d = new Date(date);
    // If it's a number and seems small (seconds), multiply by 1000
    if (typeof date === 'number' && date < 10_000_000_000) {
      d.setTime(date * 1000);
    }
    return d.toLocaleDateString();
  } catch (error) {
    logger.error('Error formatting date', error as Error);
    return 'Invalid date';
  }
};

/**
 * Formats a timestamp as "Last synced: X ago" or just the date/time
 */
export const formatLastSync = (timestamp: number | undefined): string => {
    if (!timestamp) return 'Never synced';
    const now = Date.now();
    const diff = now - (timestamp * 1000); // Assuming timestamp is in seconds

    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
};

/**
 * Formats a number with comma separators (e.g. 1,234)
 */
export const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
};
