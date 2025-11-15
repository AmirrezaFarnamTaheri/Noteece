/**
 * Haptic Feedback Utility
 *
 * Provides consistent haptic feedback throughout the app.
 * Respects user's haptic feedback preference from settings.
 */

import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

class HapticManager {
  private enabled: boolean = true;

  /**
   * Initialize haptic manager with user preferences
   */
  async initialize() {
    try {
      const settings = await AsyncStorage.getItem("app_settings");
      if (settings) {
        const parsed = JSON.parse(settings);
        this.enabled = parsed.haptics !== false;
      }
    } catch (error) {
      console.error("Failed to load haptic preferences:", error);
      this.enabled = true; // Default to enabled
    }
  }

  /**
   * Update haptic enabled state
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Light haptic feedback for subtle interactions
   * Use for: hover states, small UI changes, minor confirmations
   */
  async light() {
    if (!this.enabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Silently fail - haptics may not be available on all devices
    }
  }

  /**
   * Medium haptic feedback for standard interactions
   * Use for: button presses, list selections, toggles
   */
  async medium() {
    if (!this.enabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Silently fail
    }
  }

  /**
   * Heavy haptic feedback for important interactions
   * Use for: important actions, confirmations, errors
   */
  async heavy() {
    if (!this.enabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Silently fail
    }
  }

  /**
   * Success haptic feedback
   * Use for: successful operations, task completion
   */
  async success() {
    if (!this.enabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Silently fail
    }
  }

  /**
   * Warning haptic feedback
   * Use for: warnings, caution required
   */
  async warning() {
    if (!this.enabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Silently fail
    }
  }

  /**
   * Error haptic feedback
   * Use for: errors, failed operations
   */
  async error() {
    if (!this.enabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Silently fail
    }
  }

  /**
   * Selection haptic feedback
   * Use for: switching between items, picker selection
   */
  async selection() {
    if (!this.enabled) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Silently fail
    }
  }

  /**
   * Rigid haptic feedback
   * Use for: reaching boundaries, limits
   */
  async rigid() {
    if (!this.enabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    } catch {
      // Silently fail
    }
  }

  /**
   * Soft haptic feedback
   * Use for: gentle confirmations, passive feedback
   */
  async soft() {
    if (!this.enabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    } catch {
      // Silently fail
    }
  }
}

// Export singleton instance
export const hapticManager = new HapticManager();

// Initialize on module load
hapticManager.initialize();

// Convenience exports for direct use
export const haptics = {
  light: () => hapticManager.light(),
  medium: () => hapticManager.medium(),
  heavy: () => hapticManager.heavy(),
  success: () => hapticManager.success(),
  warning: () => hapticManager.warning(),
  error: () => hapticManager.error(),
  selection: () => hapticManager.selection(),
  rigid: () => hapticManager.rigid(),
  soft: () => hapticManager.soft(),
};
