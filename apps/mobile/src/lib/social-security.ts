/**
 * Social Security Module
 *
 * Provides biometric authentication for accessing social media data.
 * This is an additional security layer on top of the vault encryption.
 *
 * Security Model:
 * - Biometric lock is optional (user preference)
 * - When enabled, requires biometric auth to access Social tab
 * - Uses expo-secure-store for storing the DATABASE KEY safely (Key Wrapping)
 * - Uses device biometric APIs (Face ID, Touch ID, Fingerprint)
 * - Session-based: unlocked key persists in memory until app backgrounded/closed
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';

const SOCIAL_BIOMETRIC_ENABLED_KEY = 'social_biometric_enabled';
const SOCIAL_KEY_STORAGE_KEY = 'social_db_key_wrapped'; // The wrapped key stored in SecureStore

// In-memory session storage for the key (cleared when app closes or locks)
let sessionKey: string | null = null;

/**
 * Check if biometric hardware is available and enrolled on device
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch (error) {
    console.error('[SocialSecurity] Failed to check biometric availability:', error);
    return false;
  }
}

/**
 * Check if user has enabled biometric lock for social
 */
export async function isSocialBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(SOCIAL_BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('[SocialSecurity] Failed to check biometric status:', error);
    return false;
  }
}

/**
 * Enable biometric lock for social
 * This stores the provided database key (or a dummy if not provided) into SecureStore.
 * In a full implementation, this key would be used to actually decrypt the DB.
 */
export async function enableSocialBiometric(dbKey?: string): Promise<boolean> {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      console.warn('[SocialSecurity] Biometric not available on device');
      return false;
    }

    const keyToStore = dbKey || (await generateRandomKey());

    // Store key with biometric requirement if supported by OS/device policy
    // Note: Expo SecureStore access control options are limited compared to native Android Keystore,
    // but 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' is the strongest available default.
    await SecureStore.setItemAsync(SOCIAL_KEY_STORAGE_KEY, keyToStore, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      requireAuthentication: true, // This requests biometric auth on retrieval if supported
    });

    await AsyncStorage.setItem(SOCIAL_BIOMETRIC_ENABLED_KEY, 'true');

    // Clear session to force re-auth
    sessionKey = null;

    return true;
  } catch (error) {
    console.error('[SocialSecurity] Failed to enable biometric:', error);
    return false;
  }
}

/**
 * Disable biometric lock for social
 */
export async function disableSocialBiometric(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(SOCIAL_BIOMETRIC_ENABLED_KEY);
    await SecureStore.deleteItemAsync(SOCIAL_KEY_STORAGE_KEY);
    sessionKey = null;
    return true;
  } catch (error) {
    console.error('[SocialSecurity] Failed to disable biometric:', error);
    return false;
  }
}

/**
 * Check if social is unlocked in current session
 */
export function isSocialSessionUnlocked(): boolean {
  return sessionKey !== null;
}

/**
 * Get the unlocked key if available
 */
export function getUnlockedKey(): string | null {
  return sessionKey;
}

/**
 * Authenticate with biometric and unlock social session (retrieve key)
 * Returns true if authentication successful and key retrieved
 */
export async function authenticateForSocial(): Promise<boolean> {
  try {
    // Check if biometric is available
    const available = await isBiometricAvailable();
    if (!available) {
      console.warn('[SocialSecurity] Biometric not available');
      return false;
    }

    // Prompt for biometric authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to unlock Social Hub',
      fallbackLabel: 'Use Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      // Retrieve the key from SecureStore.
      // If requireAuthentication was set during storage, this might prompt again on some OS versions,
      // but usually the LocalAuthentication success is sufficient or handled by the OS keystore flow.
      // For Expo SecureStore, we just read it out now.
      const key = await SecureStore.getItemAsync(SOCIAL_KEY_STORAGE_KEY, {
        requireAuthentication: true,
      });

      if (key) {
        sessionKey = key;
        return true;
      } else {
        console.error('[SocialSecurity] Auth success but key not found');
        return false;
      }
    }

    console.warn('[SocialSecurity] Authentication failed:', result.error);
    return false;
  } catch (error) {
    console.error('[SocialSecurity] Authentication error:', error);
    return false;
  }
}

/**
 * Lock social session (clears memory)
 */
export async function lockSocialSession(): Promise<void> {
  sessionKey = null;
}

/**
 * Check if social access requires authentication
 * Returns true if biometric auth is needed before showing social data
 */
export async function requiresSocialAuthentication(): Promise<boolean> {
  try {
    const enabled = await isSocialBiometricEnabled();
    if (!enabled) {
      return false; // Biometric lock not enabled
    }

    return sessionKey === null; // Requires auth if key not in memory
  } catch (error) {
    console.error('[SocialSecurity] Failed to check auth requirement:', error);
    // SECURITY: Fail closed
    return true;
  }
}

/**
 * Get supported biometric types on device
 */
export async function getSupportedBiometricTypes(): Promise<string[]> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const typeNames: string[] = [];

    for (const type of types) {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          typeNames.push('Fingerprint');
          break;
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          typeNames.push('Face ID');
          break;
        case LocalAuthentication.AuthenticationType.IRIS:
          typeNames.push('Iris');
          break;
      }
    }

    return typeNames;
  } catch (error) {
    console.error('[SocialSecurity] Failed to get biometric types:', error);
    return [];
  }
}

/**
 * Helper to generate a random key if one isn't provided
 */
async function generateRandomKey(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
