/**
 * Background Sync for Mobile App
 * Handles periodic background synchronization
 */

import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { SyncClient } from "./sync-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKGROUND_SYNC_TASK = "background-sync-task";

// Define the background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const deviceId = await AsyncStorage.getItem("device_id");
    if (!deviceId) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    const syncClient = new SyncClient(deviceId);

    // Discover devices on local network
    const devices = await syncClient.discoverDevices();

    // Sync with first available device
    if (devices.length > 0) {
      const success = await syncClient.initiateSync(
        devices[0].id,
        devices[0].address,
      );
      return success
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.Failed;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error("Background sync failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Start background sync (idempotent - safe to call multiple times)
 */
export async function startBackgroundSync(): Promise<void> {
  try {
    // Check if task is already registered to prevent duplicates
    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);

    if (isRegistered) {
      console.log("Background sync already running");
      return;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log("Background sync started");
  } catch (error) {
    console.error("Failed to start background sync:", error);
  }
}

/**
 * Stop background sync
 */
export async function stopBackgroundSync(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log("Background sync stopped");
  } catch (error) {
    console.error("Failed to stop background sync:", error);
  }
}

/**
 * Trigger manual sync
 */
export async function triggerManualSync(): Promise<boolean> {
  try {
    const deviceId = await AsyncStorage.getItem("device_id");
    if (!deviceId) {
      return false;
    }

    const syncClient = new SyncClient(deviceId);
    const devices = await syncClient.discoverDevices();

    if (devices.length > 0) {
      return await syncClient.initiateSync(devices[0].id, devices[0].address);
    }

    return false;
  } catch (error) {
    console.error("Manual sync failed:", error);
    return false;
  }
}
