import React from 'react';
import { Text, Tooltip } from '@mantine/core';

export interface DateDisplayProps {
  /** Timestamp in milliseconds (positive number) */
  timestamp: number;
  /** Display format: 'relative' or 'absolute' */
  format?: 'relative' | 'absolute';
  /** Show tooltip with full date */
  withTooltip?: boolean;
  /** Text color */
  color?: string;
  /** Text size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Validates that timestamp is a valid positive number in milliseconds
 */
function isValidTimestamp(timestamp: number): boolean {
  return (
    typeof timestamp === 'number' &&
    Number.isFinite(timestamp) &&
    timestamp >= 0 &&
    !Number.isNaN(new Date(timestamp).getTime())
  );
}

/**
 * Converts timestamp to relative time string (e.g., "2 hours ago")
 * Handles both past and future dates
 */
function getRelativeTime(timestamp: number): string {
  if (!isValidTimestamp(timestamp)) {
    return 'Invalid date';
  }

  const now = Date.now();
  const diff = now - timestamp;

  // Handle future dates
  if (diff < 0) {
    const futureDiff = Math.abs(diff);
    const seconds = Math.floor(futureDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'in a moment';
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30.44); // Average days in a month
  const years = Math.floor(days / 365.25); // Account for leap years

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

/**
 * Formats timestamp to absolute date string
 */
function getAbsoluteDate(timestamp: number): string {
  if (!isValidTimestamp(timestamp)) {
    return 'Invalid date';
  }

  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Displays a timestamp in human-readable format with optional tooltip
 * @param timestamp - Unix timestamp in milliseconds
 * @param format - Display format (relative or absolute)
 * @param withTooltip - Show tooltip with full date
 * @param color - Text color
 * @param size - Text size
 */
export function DateDisplay({
  timestamp,
  format = 'relative',
  withTooltip = true,
  color = 'dimmed',
  size = 'sm',
}: DateDisplayProps) {
  const displayText = format === 'relative' ? getRelativeTime(timestamp) : getAbsoluteDate(timestamp);
  const tooltipText = getAbsoluteDate(timestamp);

  const textElement = (
    <Text size={size} c={color} aria-label={tooltipText}>
      {displayText}
    </Text>
  );

  if (withTooltip && isValidTimestamp(timestamp)) {
    return <Tooltip label={tooltipText}>{textElement}</Tooltip>;
  }

  return textElement;
}
