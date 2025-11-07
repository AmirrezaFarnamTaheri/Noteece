/**
 * Social Security Module
 *
 * Provides biometric authentication for accessing social media data.
 * This is an additional security layer on top of the vault encryption.
 *
 * Security Model:
 * - Biometric lock is optional (user preference)
 * - When enabled, requires biometric auth to access Social tab
 * - Preference stored in AsyncStorage (not sensitive data)
 * - Uses device biometric APIs (Face ID, Touch ID, Fingerprint)
 * - Session-based: unlock persists until app backgrounded/closed
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

const SOCIAL_BIOMETRIC_ENABLED_KEY = "social_biometric_enabled";
const SOCIAL_SESSION_UNLOCKED_KEY = "social_session_unlocked";

/**
 * Check if biometric hardware is available and enrolled on device
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch (error) {
    console.error("[SocialSecurity] Failed to check biometric availability:", error);
    return false;
  }
}

/**
 * Check if user has enabled biometric lock for social
 */
export async function isSocialBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(SOCIAL_BIOMETRIC_ENABLED_KEY);
    return enabled === "true";
  } catch (error) {
    console.error("[SocialSecurity] Failed to check biometric status:", error);
    return false;
  }
}

/**
 * Enable biometric lock for social
 */
export async function enableSocialBiometric(): Promise<boolean> {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      console.warn("[SocialSecurity] Biometric not available on device");
      return false;
    }

    await AsyncStorage.setItem(SOCIAL_BIOMETRIC_ENABLED_KEY, "true");
    await AsyncStorage.removeItem(SOCIAL_SESSION_UNLOCKED_KEY);
    console.log("[SocialSecurity] Biometric lock enabled for social");
    return true;
  } catch (error) {
    console.error("[SocialSecurity] Failed to enable biometric:", error);
    return false;
  }
}

/**
 * Disable biometric lock for social
 */
export async function disableSocialBiometric(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(SOCIAL_BIOMETRIC_ENABLED_KEY);
    await AsyncStorage.removeItem(SOCIAL_SESSION_UNLOCKED_KEY);
    console.log("[SocialSecurity] Biometric lock disabled for social");
    return true;
  } catch (error) {
    console.error("[SocialSecurity] Failed to disable biometric:", error);
    return false;
  }
}

/**
 * Check if social is unlocked in current session
 */
export async function isSocialSessionUnlocked(): Promise<boolean> {
  try {
    const unlocked = await AsyncStorage.getItem(SOCIAL_SESSION_UNLOCKED_KEY);
    return unlocked === "true";
  } catch (error) {
    console.error("[SocialSecurity] Failed to check session status:", error);
    return false;
  }
}

/**
 * Authenticate with biometric and unlock social session
 * Returns true if authentication successful
 */
export async function authenticateForSocial(): Promise<boolean> {
  try {
    // Check if biometric is available
    const available = await isBiometricAvailable();
    if (!available) {
      console.warn("[SocialSecurity] Biometric not available");
      return false;
    }

    // Prompt for biometric authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to access Social Hub",
      fallbackLabel: "Cancel",
      cancelLabel: "Cancel",
      disableDeviceFallback: false, // Allow device PIN as fallback
    });

    if (result.success) {
      // Mark session as unlocked
      await AsyncStorage.setItem(SOCIAL_SESSION_UNLOCKED_KEY, "true");
      console.log("[SocialSecurity] Social session unlocked");
      return true;
    }

    console.warn("[SocialSecurity] Authentication failed:", result.error);
    return false;
  } catch (error) {
    console.error("[SocialSecurity] Authentication error:", error);
    return false;
  }
}

/**
 * Lock social session (requires biometric on next access)
 */
export async function lockSocialSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SOCIAL_SESSION_UNLOCKED_KEY);
    console.log("[SocialSecurity] Social session locked");
  } catch (error) {
    console.error("[SocialSecurity] Failed to lock session:", error);
  }
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

    const sessionUnlocked = await isSocialSessionUnlocked();
    return !sessionUnlocked; // Requires auth if session not unlocked
  } catch (error) {
    console.error("[SocialSecurity] Failed to check auth requirement:", error);
    // SECURITY: Fail closed - require authentication on error to prevent bypass
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
          typeNames.push("Fingerprint");
          break;
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          typeNames.push("Face ID");
          break;
        case LocalAuthentication.AuthenticationType.IRIS:
          typeNames.push("Iris");
          break;
      }
    }

    return typeNames;
  } catch (error) {
    console.error("[SocialSecurity] Failed to get biometric types:", error);
    return [];
  }
}
