/**
 * Device ID Management
 *
 * Centralized utility for managing device IDs across the mobile app.
 * Uses SecureStore as the primary storage mechanism for device IDs.
 */

import * as SecureStore from 'expo-secure-store';
import { Logger } from '../lib/logger';
// Ensure crypto.getRandomValues is available in RN
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';

const DEVICE_ID_KEY = 'device_id';

/**
 * Get or create a unique device ID for this device
 *
 * Uses SecureStore for secure, persistent storage of the device ID.
 * Falls back to generating a temporary UUID if SecureStore is unavailable.
 *
 * @returns Promise resolving to the device ID
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    // Try to retrieve existing device ID from secure storage
    const existingId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existingId) {
      return existingId;
    }

    // Generate a new unique device ID if not found
    const newDeviceId = uuid();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, newDeviceId);
    Logger.info('[DeviceId] Generated new device ID');
    return newDeviceId;
  } catch (error) {
    Logger.warn('[DeviceId] Failed to access secure storage, using temporary UUID:', error);
    // Fallback to a temporary UUID if secure storage fails
    return uuid();
  }
}

/**
 * Clear the stored device ID
 *
 * Used for logout or reset operations.
 *
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function clearDeviceId(): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    Logger.info('[DeviceId] Device ID cleared');
    return true;
  } catch (error) {
    Logger.error('[DeviceId] Failed to clear device ID:', error);
    return false;
  }
}
