/**
 * Share Handler
 *
 * Processes content shared from other apps via iOS Share Extension
 * or Android Share Target.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface SharedItem {
  type: 'url' | 'text' | 'image';
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
    if (global.__SIMULATE_SHARE_ITEMS__) {
      const items = global.__SIMULATE_SHARE_ITEMS__;
      global.__SIMULATE_SHARE_ITEMS__ = undefined;
      return items;
    }

    if (Platform.OS === 'ios') {
      return await getSharedItemsIOS();
    } else if (Platform.OS === 'android') {
      return await getSharedItemsAndroid();
    }
    return [];
  } catch (error) {
    // Silently fail in production, log in dev if needed
    if (__DEV__) console.error('[ShareHandler] Failed to get shared items:', error);
    return [];
  }
}

/**
 * Simulate shared items for testing without native modules
 */
export function simulateSharedItem(item: Omit<SharedItem, 'timestamp'>) {
  const fullItem = {
    ...item,
    timestamp: Date.now(),
  };

  if (!global.__SIMULATE_SHARE_ITEMS__) {
    global.__SIMULATE_SHARE_ITEMS__ = [];
  }
  global.__SIMULATE_SHARE_ITEMS__.push(fullItem);
}

declare global {
  // eslint-disable-next-line no-var
  var __SIMULATE_SHARE_ITEMS__: SharedItem[] | undefined;
}

/**
 * Clear shared items from native storage
 */
export async function clearSharedItems(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await clearSharedItemsIOS();
    } else if (Platform.OS === 'android') {
      await clearSharedItemsAndroid();
    }
  } catch (error) {
    if (__DEV__) console.error('[ShareHandler] Failed to clear shared items:', error);
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

    // Save to pending items for processing by SocialHub
    const pendingKey = 'social_pending_items';
    const MAX_QUEUE_SIZE = 1000;
    const MAX_ITEM_SIZE = 100_000;

    const existing = await AsyncStorage.getItem(pendingKey);
    let pendingItems: any[] = [];

    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) {
          pendingItems = parsed;
        }
      } catch {
        pendingItems = [];
      }
    }

    for (const item of items) {
      const itemSize = JSON.stringify(item).length;
      if (itemSize > MAX_ITEM_SIZE) {
        continue;
      }

      pendingItems.push({
        ...item,
        processedAt: null,
        savedAt: Date.now(),
      });
    }

    if (pendingItems.length > MAX_QUEUE_SIZE) {
      pendingItems = pendingItems.slice(-MAX_QUEUE_SIZE);
    }

    await AsyncStorage.setItem(pendingKey, JSON.stringify(pendingItems));
    await clearSharedItems();

    return items.length;
  } catch (error) {
    if (__DEV__) console.error('[ShareHandler] Failed to process shared items:', error);
    return 0;
  }
}

/**
 * Get pending items that need to be displayed/processed
 */
export async function getPendingItems(): Promise<any[]> {
  try {
    const pendingKey = 'social_pending_items';
    const data = await AsyncStorage.getItem(pendingKey);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    if (__DEV__) console.error('[ShareHandler] Failed to get pending items:', error);
    return [];
  }
}

/**
 * Mark items as processed
 */
export async function markItemsProcessed(timestamps: number[]): Promise<void> {
  try {
    const pendingKey = 'social_pending_items';
    const data = await AsyncStorage.getItem(pendingKey);

    if (!data) return;

    const items = JSON.parse(data);
    const timestampSet = new Set(timestamps);

    const updated = items.map((item: any) => {
      if (timestampSet.has(item.timestamp)) {
        return { ...item, processedAt: Date.now() };
      }
      return item;
    });

    await AsyncStorage.setItem(pendingKey, JSON.stringify(updated));
  } catch (error) {
    if (__DEV__) console.error('[ShareHandler] Failed to mark items processed:', error);
  }
}

/**
 * Remove processed items older than 24 hours
 */
export async function cleanupProcessedItems(): Promise<void> {
  try {
    const pendingKey = 'social_pending_items';
    const data = await AsyncStorage.getItem(pendingKey);

    if (!data) return;

    const items = JSON.parse(data);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    const filtered = items.filter((item: any) => {
      if (!item.processedAt) return true;
      return item.processedAt > cutoff;
    });

    await AsyncStorage.setItem(pendingKey, JSON.stringify(filtered));
  } catch (error) {
    if (__DEV__) console.error('[ShareHandler] Failed to cleanup items:', error);
  }
}

// Platform Stubs - these would map to NativeModules in a full React Native link
// For now, they return empty, effectively disabling the feature until native code is linked.

async function getSharedItemsIOS(): Promise<SharedItem[]> {
  // Native Module Bridge would go here
  // return NativeModules.ShareMenu.getSharedItems();
  return [];
}

async function clearSharedItemsIOS(): Promise<void> {
  // NativeModules.ShareMenu.clearSharedItems();
}

async function getSharedItemsAndroid(): Promise<SharedItem[]> {
  // NativeModules.ShareMenu.getSharedItems();
  return [];
}

async function clearSharedItemsAndroid(): Promise<void> {
  // NativeModules.ShareMenu.clearSharedItems();
}
