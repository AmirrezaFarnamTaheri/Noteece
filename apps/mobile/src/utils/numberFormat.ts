/**
 * Number Formatting Utilities
 *
 * Centralized number formatting functions for consistent display across the app.
 */

/**
 * Format a number with appropriate suffixes (K, M, B)
 *
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "1.2K", "3.5M")
 *
 * @example
 * formatCompactNumber(1234) // "1.2K"
 * formatCompactNumber(1234567) // "1.2M"
 * formatCompactNumber(1234567890) // "1.2B"
 */
export function formatCompactNumber(num: number, decimals: number = 1): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(decimals)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(decimals)}K`;
  }
  return num.toString();
}

/**
 * Format a number with lowercase suffixes (k, m, b)
 *
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "1.2k", "3.5m")
 */
export function formatCompactNumberLowercase(num: number, decimals: number = 1): string {
  return formatCompactNumber(num, decimals).toLowerCase();
}

/**
 * Format a number with thousands separators
 *
 * @param num - The number to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted string (e.g., "1,234", "1,234,567")
 *
 * @example
 * formatWithCommas(1234) // "1,234"
 * formatWithCommas(1234567) // "1,234,567"
 */
export function formatWithCommas(num: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format a number as currency
 *
 * @param num - The amount to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted currency string (e.g., "$1,234.56")
 *
 * @example
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency(1234.56, 'EUR', 'de-DE') // "1.234,56 €"
 */
export function formatCurrency(num: number, currency: string = 'USD', locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(num);
}

/**
 * Format a number as a percentage
 *
 * @param num - The number to format (0-1 range)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string (e.g., "75%")
 *
 * @example
 * formatPercentage(0.75) // "75%"
 * formatPercentage(0.7532, 2) // "75.32%"
 */
export function formatPercentage(num: number, decimals: number = 0): string {
  return `${(num * 100).toFixed(decimals)}%`;
}

/**
 * Format a decimal number with fixed decimal places
 *
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 *
 * @example
 * formatDecimal(3.14159, 2) // "3.14"
 * formatDecimal(10, 2) // "10.00"
 */
export function formatDecimal(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

/**
 * Format a file size in bytes to human-readable format
 *
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "1.2 KB", "3.5 MB")
 *
 * @example
 * formatFileSize(1024) // "1.0 KB"
 * formatFileSize(1536) // "1.5 KB"
 * formatFileSize(1048576) // "1.0 MB"
 */
export function formatFileSize(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format a number as an ordinal (1st, 2nd, 3rd, etc.)
 *
 * @param num - The number to format
 * @returns Ordinal string (e.g., "1st", "2nd", "3rd", "4th")
 *
 * @example
 * formatOrdinal(1) // "1st"
 * formatOrdinal(2) // "2nd"
 * formatOrdinal(3) // "3rd"
 * formatOrdinal(4) // "4th"
 */
export function formatOrdinal(num: number): string {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) {
    return `${num}st`;
  }
  if (j === 2 && k !== 12) {
    return `${num}nd`;
  }
  if (j === 3 && k !== 13) {
    return `${num}rd`;
  }
  return `${num}th`;
}

/**
 * Round a number to the nearest integer
 *
 * @param num - The number to round
 * @returns Rounded integer
 */
export function roundToInt(num: number): number {
  return Math.round(num);
}

/**
 * Clamp a number between min and max values
 *
 * @param num - The number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped number
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * Format a number with a sign prefix (+ or -)
 *
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with sign (e.g., "+5", "-3")
 */
export function formatWithSign(num: number, decimals: number = 0): string {
  const formatted = num.toFixed(decimals);
  return num > 0 ? `+${formatted}` : formatted;
}
