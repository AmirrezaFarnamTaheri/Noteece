/**
 * Platform Utilities
 *
 * Centralized platform-specific configuration and helpers.
 * Reduces scattered Platform.select() calls throughout the codebase.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Check if running on iOS
 */
export const isIOS = Platform.OS === 'ios';

/**
 * Check if running on Android
 */
export const isAndroid = Platform.OS === 'android';

/**
 * Check if running on web
 */
export const isWeb = Platform.OS === 'web';

/**
 * Get platform-specific database path for Expo SQLite
 *
 * iOS: Documents/SQLite/database.db
 * Android: Documents/database.db
 *
 * @param databaseName - Name of the database file (e.g., 'noteece.db')
 * @returns Absolute path to the database file
 */
export function getDatabasePath(databaseName: string): string {
  const docDirUri = FileSystem.documentDirectory;
  const docDir = docDirUri?.replace('file://', '') || '';

  if (isIOS) {
    // Expo SQLite on iOS puts files in 'SQLite' subdirectory of documents
    return `${docDir}SQLite/${databaseName}`;
  } else {
    // On Android, files are in the documents directory
    return `${docDir}${databaseName}`;
  }
}

/**
 * Platform-specific spacing values
 */
export const platformSpacing = {
  statusBarHeight: Platform.select({
    ios: 44,
    android: 24,
    default: 0,
  }),
  bottomBarHeight: Platform.select({
    ios: 34,
    android: 0,
    default: 0,
  }),
  headerHeight: Platform.select({
    ios: 88,
    android: 56,
    default: 56,
  }),
};

/**
 * Platform-specific shadow styles
 */
export const platformShadow = (elevation: number = 2) => ({
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: 0.1,
      shadowRadius: elevation * 2,
    },
    android: {
      elevation,
    },
    default: {},
  }),
});

/**
 * Platform-specific haptic feedback availability
 */
export const hasHapticFeedback = Platform.select({
  ios: true,
  android: true,
  default: false,
});

/**
 * Platform-specific font weights
 * iOS uses named font weights, Android uses numeric
 */
export const platformFontWeight = {
  regular: Platform.select({
    ios: '400' as const,
    android: 'normal' as const,
    default: 'normal' as const,
  }),
  medium: Platform.select({
    ios: '500' as const,
    android: 'normal' as const,
    default: 'normal' as const,
  }),
  semibold: Platform.select({
    ios: '600' as const,
    android: 'bold' as const,
    default: 'bold' as const,
  }),
  bold: Platform.select({
    ios: '700' as const,
    android: 'bold' as const,
    default: 'bold' as const,
  }),
};
