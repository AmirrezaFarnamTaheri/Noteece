/**
 * Date Formatting Utilities
 *
 * Centralized date and time formatting functions.
 * Uses date-fns for consistent, locale-aware formatting.
 */

import { format as dateFnsFormat, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';

/**
 * Format a timestamp as a short time string (e.g., "2:30 PM")
 */
export function formatTime(timestamp: number | Date): string {
  return dateFnsFormat(timestamp, 'h:mm a');
}

/**
 * Format a timestamp as a 24-hour time string (e.g., "14:30")
 */
export function formatTime24(timestamp: number | Date): string {
  return dateFnsFormat(timestamp, 'HH:mm');
}

/**
 * Format a timestamp as a short date (e.g., "Jan 15")
 */
export function formatShortDate(timestamp: number | Date): string {
  return dateFnsFormat(timestamp, 'MMM d');
}

/**
 * Format a timestamp as a medium date (e.g., "Jan 15, 2024")
 */
export function formatMediumDate(timestamp: number | Date): string {
  return dateFnsFormat(timestamp, 'MMM d, yyyy');
}

/**
 * Format a timestamp as a full date (e.g., "Monday, January 15, 2024")
 */
export function formatFullDate(timestamp: number | Date): string {
  return dateFnsFormat(timestamp, 'EEEE, MMMM d, yyyy');
}

/**
 * Format a timestamp as a short date with time (e.g., "Jan 15, 2:30 PM")
 */
export function formatShortDateTime(timestamp: number | Date): string {
  return dateFnsFormat(timestamp, 'MMM d, h:mm a');
}

/**
 * Format a timestamp as a medium date with time (e.g., "Jan 15, 2024, 2:30 PM")
 */
export function formatMediumDateTime(timestamp: number | Date): string {
  return dateFnsFormat(timestamp, 'MMM d, yyyy, h:mm a');
}

/**
 * Format a timestamp as a full date with time (e.g., "Monday, January 15, 2024 at 2:30 PM")
 */
export function formatFullDateTime(timestamp: number | Date): string {
  return dateFnsFormat(timestamp, "EEEE, MMMM d, yyyy 'at' h:mm a");
}

/**
 * Format duration in minutes to a readable string (e.g., "2h 30m")
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
}

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDurationSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a timestamp relative to now (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(timestamp: number | Date): string {
  return formatDistanceToNow(timestamp, { addSuffix: true });
}

/**
 * Format a timestamp smartly based on how recent it is
 * - Today: "2:30 PM"
 * - Yesterday: "Yesterday at 2:30 PM"
 * - This week: "Monday at 2:30 PM"
 * - This year: "Jan 15 at 2:30 PM"
 * - Older: "Jan 15, 2023"
 */
export function formatSmartDateTime(timestamp: number | Date): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;

  if (isToday(date)) {
    return formatTime(date);
  } else if (isYesterday(date)) {
    return `Yesterday at ${formatTime(date)}`;
  } else if (isThisWeek(date)) {
    return dateFnsFormat(date, "EEEE 'at' h:mm a");
  } else if (isThisYear(date)) {
    return dateFnsFormat(date, "MMM d 'at' h:mm a");
  } else {
    return formatMediumDate(date);
  }
}

/**
 * Format a timestamp smartly for a post/message card
 * - Less than 1 minute: "Just now"
 * - Less than 1 hour: "X minutes ago"
 * - Today: "X hours ago"
 * - Yesterday: "Yesterday"
 * - This week: "Monday"
 * - This year: "Jan 15"
 * - Older: "Jan 15, 2023"
 */
export function formatPostTime(timestamp: number | Date): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (isToday(date)) {
    return `${diffHours}h ago`;
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else if (isThisWeek(date)) {
    return dateFnsFormat(date, 'EEEE');
  } else if (isThisYear(date)) {
    return formatShortDate(date);
  } else {
    return formatMediumDate(date);
  }
}

/**
 * Format a timestamp for display in a timeline
 * Uses the format from PostCard: "MMM d, h:mm a" (e.g., "Jan 15, 2:30 PM")
 */
export function formatTimelineDate(timestamp: number | Date): string {
  return formatShortDateTime(timestamp);
}

/**
 * Validate and normalize a timestamp
 * Returns a valid Date object or throws an error
 */
export function normalizeTimestamp(timestamp: number | Date | string | null | undefined): Date {
  if (timestamp === null || timestamp === undefined) {
    return new Date();
  }

  const date = typeof timestamp === 'number' || typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  if (isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}
