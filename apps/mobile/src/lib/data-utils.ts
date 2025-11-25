import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { getDatabase } from './database';

/**
 * Export all user data to a JSON file
 */
export async function exportAllData(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const db = getDatabase();

    // Query all data from all tables
    const [
      tasks,
      notes,
      timeEntries,
      healthMetrics,
      insights,
      calendarEvents,
      nfcTriggers,
      locationTriggers,
      syncState,
      syncQueue,
    ] = await Promise.all([
      db.getAllAsync('SELECT * FROM task'),
      db.getAllAsync('SELECT * FROM note'),
      db.getAllAsync('SELECT * FROM time_entry'),
      db.getAllAsync('SELECT * FROM health_metric'),
      db.getAllAsync('SELECT * FROM insight'),
      db.getAllAsync('SELECT * FROM calendar_event'),
      db.getAllAsync('SELECT * FROM nfc_trigger'),
      db.getAllAsync('SELECT * FROM location_trigger'),
      db.getAllAsync('SELECT * FROM sync_state'),
      db.getAllAsync('SELECT * FROM sync_queue'),
    ]);

    // Get vault metadata (strip sensitive fields before including)
    const vaultMetadataRaw = await AsyncStorage.getItem('vault_metadata');
    let safeVaultMeta: { spaceId: string | null } = { spaceId: null };
    if (vaultMetadataRaw) {
      try {
        const meta = JSON.parse(vaultMetadataRaw);
        safeVaultMeta.spaceId = meta?.spaceId ?? null;
        // Do NOT include passwordHash, salts, encryptedDek, nonces, etc.
      } catch {
        // Ignore malformed metadata
      }
    }

    // Preserve structural metadata while scrubbing secrets; do not fully drop payload shape
    const redactedSyncQueue = (syncQueue || []).map((row: any) => {
      try {
        const { data, ...rest } = row;
        let parsed: any = {};
        if (typeof data === 'string' && data.trim().startsWith('{')) {
          parsed = JSON.parse(data);
          // Remove obviously sensitive fields within payload while keeping structure
          if (parsed.credentials) parsed.credentials = '[REDACTED]';
          if (parsed.token) parsed.token = '[REDACTED]';
          if (parsed.secret) parsed.secret = '[REDACTED]';
        }
        return { ...rest, data: parsed };
      } catch {
        // Fallback to indicating that payload was scrubbed but keep metadata
        return { ...row, data: '[REDACTED]' };
      }
    });

    // Redact sensitive fields from sync_state
    const redactedSyncState = (syncState || []).map((row: any) => {
      const { device_secret, auth_token, ...rest } = row;
      return rest;
    });

    // Create export data structure
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      // Omit deviceId from export to prevent device fingerprinting
      spaceId: safeVaultMeta.spaceId,
      data: {
        tasks,
        notes,
        timeEntries,
        healthMetrics,
        insights,
        calendarEvents,
        nfcTriggers,
        locationTriggers,
        syncState: redactedSyncState,
        syncQueue: redactedSyncQueue,
      },
      stats: {
        totalTasks: tasks.length,
        totalNotes: notes.length,
        totalTimeEntries: timeEntries.length,
        totalHealthMetrics: healthMetrics.length,
        totalInsights: insights.length,
        totalCalendarEvents: calendarEvents.length,
        totalNfcTriggers: nfcTriggers.length,
        totalLocationTriggers: locationTriggers.length,
      },
    };

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `noteece-export-${timestamp}.json`;
    const filePath = `${FileSystem.documentDirectory}${filename}`;

    // Write to file
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(exportData, null, 2));

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return {
        success: false,
        error: 'Sharing is not available on this device. File saved to: ' + filePath,
      };
    }

    // Share the file and cleanup afterwards
    try {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Export Noteece Data',
        UTI: 'public.json',
      });
    } finally {
      // Best-effort cleanup to minimize unencrypted data at rest
      try {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      } catch (cleanupError) {
        // Ignore cleanup errors, but log them
        console.warn('Failed to cleanup export file:', cleanupError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to export data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export data',
    };
  }
}

/**
 * Clear all local data (database and storage)
 * WARNING: This is destructive and cannot be undone!
 */
export async function clearAllData(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const db = getDatabase();

    // Drop all tables
    await db.execAsync(`
      DROP TABLE IF EXISTS task;
      DROP TABLE IF EXISTS note;
      DROP TABLE IF EXISTS time_entry;
      DROP TABLE IF EXISTS health_metric;
      DROP TABLE IF EXISTS insight;
      DROP TABLE IF EXISTS calendar_event;
      DROP TABLE IF EXISTS nfc_trigger;
      DROP TABLE IF EXISTS location_trigger;
      DROP TABLE IF EXISTS sync_state;
      DROP TABLE IF EXISTS sync_queue;
      DROP INDEX IF EXISTS idx_task_due_at;
      DROP INDEX IF EXISTS idx_task_status;
      DROP INDEX IF EXISTS idx_calendar_event_time;
      DROP INDEX IF EXISTS idx_time_entry_running;
      DROP INDEX IF EXISTS idx_sync_queue_synced;
    `);

    // Clear AsyncStorage (keeping only essential system keys)
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter(
      (key) =>
        !key.startsWith('expo-') && // Keep Expo system keys
        key !== 'has_completed_onboarding', // Will be reset by logout
    );
    await AsyncStorage.multiRemove(keysToRemove);

    // Clear SecureStore biometric data
    try {
      await SecureStore.deleteItemAsync('biometric_vault_data');
    } catch {
      // SecureStore might not have data, that's okay
      // console.log("No SecureStore data to clear");
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to clear all data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear all data',
    };
  }
}

/**
 * Get data statistics
 */
export async function getDataStats(): Promise<{
  tasks: number;
  notes: number;
  timeEntries: number;
  healthMetrics: number;
  calendarEvents: number;
  total: number;
}> {
  try {
    const db = getDatabase();

    const [tasksCount, notesCount, timeEntriesCount, healthMetricsCount, calendarEventsCount] = await Promise.all([
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM task'),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM note'),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM time_entry'),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM health_metric'),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM calendar_event'),
    ]);

    const tasks = tasksCount?.count || 0;
    const notes = notesCount?.count || 0;
    const timeEntries = timeEntriesCount?.count || 0;
    const healthMetrics = healthMetricsCount?.count || 0;
    const calendarEvents = calendarEventsCount?.count || 0;
    const total = tasks + notes + timeEntries + healthMetrics + calendarEvents;

    return {
      tasks,
      notes,
      timeEntries,
      healthMetrics,
      calendarEvents,
      total,
    };
  } catch (error) {
    console.error('Failed to get data stats:', error);
    return {
      tasks: 0,
      notes: 0,
      timeEntries: 0,
      healthMetrics: 0,
      calendarEvents: 0,
      total: 0,
    };
  }
}
