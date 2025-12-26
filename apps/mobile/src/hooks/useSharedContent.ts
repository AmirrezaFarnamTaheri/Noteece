/**
 * useSharedContent Hook
 *
 * Monitors for content shared from other apps and processes it.
 * Works with both iOS Share Extension and Android Share Target.
 *
 * Usage:
 *   const { hasSharedContent, sharedItems, processItems } = useSharedContent();
 */

import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Linking from 'expo-linking';
import {
  processSharedItems,
  getPendingItems,
  markItemsProcessed,
  cleanupProcessedItems,
  SharedItem,
} from '../lib/share-handler';
import { Logger } from '../lib/logger';

interface PendingItem extends SharedItem {
  savedAt: number;
  processedAt: number | null;
}

export function useSharedContent() {
  const [hasSharedContent, setHasSharedContent] = useState(false);
  const [sharedItems, setSharedItems] = useState<PendingItem[]>([]);

  // Check for shared content on mount and app state changes
  useEffect(() => {
    checkForSharedContent();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for deep link events (share extension may use deep links)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUrl = async (event: { url: any }) => {
      if (typeof event.url === 'string' && event.url.includes('shared_content=true')) {
        await checkForSharedContent();
      }
    };

    // Check initial URL
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('shared_content=true')) {
        checkForSharedContent();
      }
    });

    // Listen for URL events
    const subscription = Linking.addEventListener('url', handleUrl);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      await checkForSharedContent();
    }
  };

  const checkForSharedContent = async () => {
    try {
      // Process any items from native share extension
      await processSharedItems();

      // Get pending items
      const items = await getPendingItems();

      // Filter for unprocessed items
      const unprocessed = items.filter((item) => !item.processedAt);

      setSharedItems(unprocessed);
      setHasSharedContent(unprocessed.length > 0);

      // Cleanup old processed items
      await cleanupProcessedItems();
    } catch (error) {
      Logger.error('Failed to check for shared content', error);
    }
  };

  const processItems = async (timestamps: number[]) => {
    try {
      await markItemsProcessed(timestamps);
      await checkForSharedContent();
    } catch (error) {
      Logger.error('Failed to process items', error);
    }
  };

  return {
    hasSharedContent,
    sharedItems,
    processItems,
    refresh: checkForSharedContent,
  };
}
