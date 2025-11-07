/**
 * Share Handler
 *
 * Processes content shared from other apps via iOS Share Extension
 * or Android Share Target.
 *
 * Shared content is stored in:
 * - iOS: App Group UserDefaults (group.com.noteece.app.social)
 * - Android: SharedPreferences (noteece_shared_items)
 *
 * This handler runs when the main app opens and processes any pending
 * shared items.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export interface SharedItem {
  type: "url" | "text" | "image";
  url?: string;
  text?: string;
  timestamp: number;
}

/**
 * Get shared items from native storage
 * Returns array of shared items or empty array if none
 */
export async function getSharedItems(): Promise<SharedItem[]> {
  try {
    if (Platform.OS === "ios") {
      return await getSharedItemsIOS();
    } else if (Platform.OS === "android") {
      return await getSharedItemsAndroid();
    }
    return [];
  } catch (error) {
    console.error("[ShareHandler] Failed to get shared items:", error);
    return [];
  }
}

/**
 * Clear shared items from native storage
 */
export async function clearSharedItems(): Promise<void> {
  try {
    if (Platform.OS === "ios") {
      await clearSharedItemsIOS();
    } else if (Platform.OS === "android") {
      await clearSharedItemsAndroid();
    }
  } catch (error) {
    console.error("[ShareHandler] Failed to clear shared items:", error);
  }
}

/**
 * Process shared items and save to local database
 */
export async function processSharedItems(): Promise<number> {
  try {
    const items = await getSharedItems();

    if (items.length === 0) {
      return 0;
    }

    console.log(`[ShareHandler] Processing ${items.length} shared items`);

    // Save to pending items for processing by SocialHub
    const pendingKey = "social_pending_items";
    const MAX_QUEUE_SIZE = 1000; // Prevent unbounded growth
    const MAX_ITEM_SIZE = 100_000; // 100KB per item

    const existing = await AsyncStorage.getItem(pendingKey);
    let pendingItems: any[] = [];

    // Safely parse existing items
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) {
          pendingItems = parsed;
        }
      } catch {
        // Corrupted storage; reset to empty array
        console.warn("[ShareHandler] Corrupted pending items, resetting");
        pendingItems = [];
      }
    }

    // Add new items with size validation
    for (const item of items) {
      const itemSize = JSON.stringify(item).length;
      if (itemSize > MAX_ITEM_SIZE) {
        console.warn(`[ShareHandler] Item exceeds size limit (${itemSize} > ${MAX_ITEM_SIZE}), skipping`);
        continue;
      }

      pendingItems.push({
        ...item,
        processedAt: null,
        savedAt: Date.now(),
      });
    }

    // Cap queue size (keep most recent items)
    if (pendingItems.length > MAX_QUEUE_SIZE) {
      pendingItems = pendingItems.slice(-MAX_QUEUE_SIZE);
      console.warn(`[ShareHandler] Queue exceeded maximum size, keeping ${MAX_QUEUE_SIZE} most recent items`);
    }

    await AsyncStorage.setItem(pendingKey, JSON.stringify(pendingItems));

    // Clear native storage
    await clearSharedItems();

    console.log(`[ShareHandler] Saved ${items.length} items to pending queue`);
    return items.length;
  } catch (error) {
    console.error("[ShareHandler] Failed to process shared items:", error);
    return 0;
  }
}

/**
 * Get pending items that need to be displayed/processed
 */
export async function getPendingItems(): Promise<any[]> {
  try {
    const pendingKey = "social_pending_items";
    const data = await AsyncStorage.getItem(pendingKey);

    if (!data) {
      return [];
    }

    return JSON.parse(data);
  } catch (error) {
    console.error("[ShareHandler] Failed to get pending items:", error);
    return [];
  }
}

/**
 * Mark items as processed
 */
export async function markItemsProcessed(
  timestamps: number[]
): Promise<void> {
  try {
    const pendingKey = "social_pending_items";
    const data = await AsyncStorage.getItem(pendingKey);

    if (!data) {
      return;
    }

    const items = JSON.parse(data);
    const timestampSet = new Set(timestamps);

    // Mark matching items as processed
    const updated = items.map((item: any) => {
      if (timestampSet.has(item.timestamp)) {
        return { ...item, processedAt: Date.now() };
      }
      return item;
    });

    await AsyncStorage.setItem(pendingKey, JSON.stringify(updated));
  } catch (error) {
    console.error("[ShareHandler] Failed to mark items processed:", error);
  }
}

/**
 * Remove processed items older than 24 hours
 */
export async function cleanupProcessedItems(): Promise<void> {
  try {
    const pendingKey = "social_pending_items";
    const data = await AsyncStorage.getItem(pendingKey);

    if (!data) {
      return;
    }

    const items = JSON.parse(data);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    // Keep only unprocessed items or recently processed items
    const filtered = items.filter((item: any) => {
      if (!item.processedAt) {
        return true; // Keep unprocessed
      }
      return item.processedAt > cutoff; // Keep recent
    });

    await AsyncStorage.setItem(pendingKey, JSON.stringify(filtered));

    const removed = items.length - filtered.length;
    if (removed > 0) {
      console.log(`[ShareHandler] Cleaned up ${removed} old items`);
    }
  } catch (error) {
    console.error("[ShareHandler] Failed to cleanup items:", error);
  }
}

// Platform-specific implementations

/**
 * iOS: Read from App Group UserDefaults
 * Requires native module or config plugin to access
 */
async function getSharedItemsIOS(): Promise<SharedItem[]> {
  // In a real implementation, this would use a native module
  // to access the App Group UserDefaults
  // For now, return empty array as placeholder

  // TODO: Implement native module for iOS App Group access
  // Example: expo-shared-preferences or custom native module

  console.log(
    "[ShareHandler] iOS App Group access requires native module (not yet implemented)"
  );
  return [];
}

/**
 * iOS: Clear App Group UserDefaults
 */
async function clearSharedItemsIOS(): Promise<void> {
  // TODO: Implement native module for iOS App Group access
  console.log("[ShareHandler] iOS App Group clear (not yet implemented)");
}

/**
 * Android: Read from SharedPreferences
 * Requires native module or config plugin to access
 */
async function getSharedItemsAndroid(): Promise<SharedItem[]> {
  // In a real implementation, this would use a native module
  // to access SharedPreferences
  // For now, return empty array as placeholder

  // TODO: Implement native module for Android SharedPreferences access
  // Example: expo-shared-preferences or custom native module

  console.log(
    "[ShareHandler] Android SharedPreferences access requires native module (not yet implemented)"
  );
  return [];
}

/**
 * Android: Clear SharedPreferences
 */
async function clearSharedItemsAndroid(): Promise<void> {
  // TODO: Implement native module for Android SharedPreferences access
  console.log(
    "[ShareHandler] Android SharedPreferences clear (not yet implemented)"
  );
}
