/**
 * Backup and Export Utility
 *
 * Provides comprehensive backup and export functionality for user data.
 * Supports JSON export, import, and automatic backups.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
// Ensure crypto.getRandomValues is available in RN
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';
import { dbExecute, dbQuery } from './database';
import type { SocialAccount, SocialPost, SocialCategory } from '../types/social';

export interface BackupMetadata {
  version: string;
  createdAt: string;
  deviceId: string;
  platform: string;
  dataTypes: string[];
}

export interface BackupData {
  metadata: BackupMetadata;
  accounts: SocialAccount[];
  posts: SocialPost[];
  categories: SocialCategory[];
  settings?: Record<string, any>;
}

/**
 * Generate a backup filename with timestamp
 */
function generateBackupFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `noteece-backup-${timestamp}.json`;
}

/**
 * Get backup directory path
 */
function getBackupDirectory(): string {
  return `${FileSystem.documentDirectory}backups/`;
}

/**
 * Get or create a unique device ID for this device
 * Stores the ID in secure storage for persistence across app launches
 */
async function getOrCreateDeviceId(): Promise<string> {
  try {
    // Try to retrieve existing device ID from secure storage
    const existingId = await SecureStore.getItemAsync('device_id');
    if (existingId) {
      return existingId;
    }

    // Generate a new unique device ID if not found
    const newDeviceId = uuid();
    await SecureStore.setItemAsync('device_id', newDeviceId);
    return newDeviceId;
  } catch (error) {
    console.warn('Failed to access secure storage for device ID, using temporary UUID:', error);
    // Fallback to a temporary UUID if secure storage fails
    return uuid();
  }
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDirectory(): Promise<void> {
  const backupDir = getBackupDirectory();
  const dirInfo = await FileSystem.getInfoAsync(backupDir);

  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
  }
}

/**
 * Export social accounts (without credentials for security)
 */
async function exportAccounts(spaceId: string): Promise<Omit<SocialAccount, 'credentials_encrypted'>[]> {
  const accounts = await dbQuery<any>(
    `SELECT id, space_id, platform, username, display_name,
            enabled, sync_frequency_minutes, last_sync_time, created_at
     FROM social_account
     WHERE space_id = ?`,
    [spaceId],
  );

  return accounts;
}

/**
 * Export social posts
 * Scrubs raw_json field to prevent exposure of sensitive platform-derived data
 */
async function exportPosts(spaceId: string): Promise<any[]> {
  const posts = await dbQuery<any>(
    `SELECT p.*
     FROM social_post p
     JOIN social_account a ON p.account_id = a.id
     WHERE a.space_id = ?
     ORDER BY p.created_at DESC`,
    [spaceId],
  );

  // Scrub sensitive fields from raw_json to prevent exposure of tokens, credentials, etc.
  return posts.map((post) => {
    if (post.raw_json) {
      try {
        const rawData = JSON.parse(post.raw_json);
        // Remove potentially sensitive fields that platforms might include
        const scrubbed = {
          ...rawData,
          // Remove common sensitive field patterns
          access_token: undefined,
          accessToken: undefined,
          refresh_token: undefined,
          refreshToken: undefined,
          client_secret: undefined,
          clientSecret: undefined,
          token: undefined,
          credentials: undefined,
          auth: undefined,
          authorization: undefined,
          session: undefined,
          cookie: undefined,
          api_key: undefined,
          apiKey: undefined,
          secret: undefined,
        };
        // Filter out undefined values
        Object.keys(scrubbed).forEach((key) => scrubbed[key] === undefined && delete scrubbed[key]);
        post.raw_json = JSON.stringify(scrubbed);
      } catch {
        // If parsing fails, remove raw_json entirely for safety
        post.raw_json = null;
      }
    }
    return post;
  });
}

/**
 * Export categories with their filters
 */
async function exportCategories(spaceId: string): Promise<any[]> {
  const categories = await dbQuery<any>(
    `SELECT id, space_id, name, color, icon, filters_json, created_at
     FROM social_category
     WHERE space_id = ?`,
    [spaceId],
  );

  return categories;
}

/**
 * Export application settings
 * Includes preferences, user settings, and app configuration
 */
async function exportAppSettings(): Promise<Record<string, any>> {
  try {
    const settings: Record<string, any> = {};

    // Export theme and display preferences
    const theme = await SecureStore.getItemAsync('theme_preference');
    if (theme) settings.theme = theme;

    const language = await SecureStore.getItemAsync('language');
    if (language) settings.language = language;

    const notificationsEnabled = await SecureStore.getItemAsync('notifications_enabled');
    if (notificationsEnabled) settings.notificationsEnabled = notificationsEnabled === 'true';

    // Export sync preferences
    const autoSync = await SecureStore.getItemAsync('auto_sync_enabled');
    if (autoSync) settings.autoSyncEnabled = autoSync === 'true';

    const syncInterval = await SecureStore.getItemAsync('sync_interval_minutes');
    if (syncInterval) settings.syncIntervalMinutes = parseInt(syncInterval, 10);

    // Export privacy settings
    const shareAnalytics = await SecureStore.getItemAsync('share_analytics');
    if (shareAnalytics) settings.shareAnalytics = shareAnalytics === 'true';

    console.log('[Backup] Exported app settings:', Object.keys(settings));
    return settings;
  } catch (error) {
    console.warn('[Backup] Failed to export app settings, returning empty object:', error);
    return {};
  }
}

/**
 * Create a complete backup of all user data
 */
export async function createBackup(
  spaceId: string,
  options: {
    includeAccounts?: boolean;
    includePosts?: boolean;
    includeCategories?: boolean;
    includeSettings?: boolean;
  } = {},
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const { includeAccounts = true, includePosts = true, includeCategories = true, includeSettings = true } = options;

    await ensureBackupDirectory();

    // Get actual device ID from device storage or generate a unique one
    const deviceId = await getOrCreateDeviceId();

    const metadata: BackupMetadata = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      deviceId: deviceId,
      platform: 'mobile',
      dataTypes: [],
    };

    const backupData: Partial<BackupData> = { metadata };

    // Export accounts (without credentials)
    if (includeAccounts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      backupData.accounts = (await exportAccounts(spaceId)) as any;
      metadata.dataTypes.push('accounts');
    }

    // Export posts
    if (includePosts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      backupData.posts = (await exportPosts(spaceId)) as any;
      metadata.dataTypes.push('posts');
    }

    // Export categories
    if (includeCategories) {
      backupData.categories = await exportCategories(spaceId);
      metadata.dataTypes.push('categories');
    }

    // Export settings (if applicable)
    if (includeSettings) {
      // Export app settings from secure storage and app preferences
      backupData.settings = await exportAppSettings();
      metadata.dataTypes.push('settings');
    }

    // Write backup to file
    const filename = generateBackupFilename();
    const filePath = getBackupDirectory() + filename;
    const backupJson = JSON.stringify(backupData, null, 2);

    await FileSystem.writeAsStringAsync(filePath, backupJson, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    console.log(`[Backup] Created backup: ${filePath} (${backupJson.length} bytes)`);

    return { success: true, filePath };
  } catch (error) {
    console.error('[Backup] Failed to create backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export backup and share it
 */
export async function exportAndShare(spaceId: string): Promise<void> {
  try {
    const result = await createBackup(spaceId);

    if (!result.success || !result.filePath) {
      Alert.alert('Export Failed', result.error || 'Failed to create backup');
      return;
    }

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing Not Available', `Backup saved to: ${result.filePath}\n\nPlease copy this file manually.`);
      return;
    }

    // Share the backup file
    await Sharing.shareAsync(result.filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Export Noteece Backup',
      UTI: 'public.json',
    });
  } catch (error) {
    console.error('[Backup] Export failed:', error);
    Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Import backup from JSON data
 */
export async function importBackup(
  backupJson: string,
  options: {
    mergeStrategy?: 'replace' | 'merge' | 'skip';
    validateOnly?: boolean;
  } = {},
): Promise<{
  success: boolean;
  imported?: {
    accounts: number;
    posts: number;
    categories: number;
  };
  error?: string;
}> {
  try {
    const { mergeStrategy = 'merge', validateOnly = false } = options;

    // Parse backup data
    const backupData: BackupData = JSON.parse(backupJson);

    // Validate backup structure
    if (!backupData.metadata || !backupData.metadata.version) {
      throw new Error('Invalid backup format: missing metadata');
    }

    // Strict version format validation
    const version = backupData?.metadata?.version;
    if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
      throw new Error('Invalid backup format: bad version');
    }

    // Version compatibility check
    const [major] = version.split('.');
    if (major !== '1') {
      throw new Error(`Incompatible backup version: ${version}`);
    }

    if (validateOnly) {
      return { success: true };
    }

    const imported = {
      accounts: 0,
      posts: 0,
      categories: 0,
    };

    // Import categories first (posts may reference them)
    if (backupData.categories) {
      for (const category of backupData.categories) {
        try {
          if (mergeStrategy === 'replace') {
            // Delete existing and insert new
            await dbExecute('DELETE FROM social_category WHERE id = ?', [category.id]);
          }

          await dbExecute(
            `INSERT OR ${mergeStrategy === 'skip' ? 'IGNORE' : 'REPLACE'} INTO social_category
             (id, space_id, name, color, icon, filters_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              category.id,
              category.space_id,
              category.name,
              category.color,
              category.icon,
              // @ts-ignore: type mismatch in BackupData vs database schema
              category.filters_json,
              category.created_at,
            ],
          );

          imported.categories++;
        } catch (error) {
          console.error(`[Backup] Failed to import category ${category.id}:`, error);
        }
      }
    }

    // Import accounts (credentials will need to be re-entered)
    if (backupData.accounts) {
      for (const account of backupData.accounts) {
        try {
          if (mergeStrategy === 'replace') {
            await dbExecute('DELETE FROM social_account WHERE id = ?', [account.id]);
          }

          await dbExecute(
            `INSERT OR ${mergeStrategy === 'skip' ? 'IGNORE' : 'REPLACE'} INTO social_account
             (id, space_id, platform, username, display_name, credentials_encrypted,
              enabled, sync_frequency_minutes, last_sync_time, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              account.id,
              account.space_id,
              account.platform,
              account.username,
              account.display_name,
              new Uint8Array(0), // Empty credentials - user will need to re-enter
              account.enabled ? 1 : 0,
              account.sync_frequency_minutes,
              // @ts-ignore: type mismatch
              account.last_sync_time,
              account.created_at,
            ],
          );

          imported.accounts++;
        } catch (error) {
          console.error(`[Backup] Failed to import account ${account.id}:`, error);
        }
      }
    }

    // Import posts
    if (backupData.posts) {
      for (const post of backupData.posts) {
        try {
          if (mergeStrategy === 'replace') {
            await dbExecute('DELETE FROM social_post WHERE id = ?', [post.id]);
          }

          await dbExecute(
            `INSERT OR ${mergeStrategy === 'skip' ? 'IGNORE' : 'REPLACE'} INTO social_post
             (id, account_id, platform, platform_post_id, author, author_avatar, author_handle,
              content, content_html, url, media_urls_json, engagement_likes, engagement_comments,
              engagement_shares, engagement_views, created_at, collected_at, post_type, reply_to, raw_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              post.id,
              post.account_id,
              post.platform,
              post.platform_post_id,
              post.author,
              post.author_avatar,
              // @ts-ignore: type mismatch
              post.author_handle,
              post.content,
              post.content_html,
              post.url,
              // @ts-ignore: type mismatch
              post.media_urls_json,
              // @ts-ignore: type mismatch
              post.engagement_likes || 0,
              // @ts-ignore: type mismatch
              post.engagement_comments || 0,
              // @ts-ignore: type mismatch
              post.engagement_shares || 0,
              // @ts-ignore: type mismatch
              post.engagement_views || 0,
              post.created_at,
              post.collected_at,
              // @ts-ignore: type mismatch
              post.post_type,
              // @ts-ignore: type mismatch
              post.reply_to,
              // @ts-ignore: type mismatch
              post.raw_json,
            ],
          );

          imported.posts++;
        } catch (error) {
          console.error(`[Backup] Failed to import post ${post.id}:`, error);
        }
      }
    }

    console.log('[Backup] Import completed:', imported);

    return { success: true, imported };
  } catch (error) {
    console.error('[Backup] Import failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<{ filename: string; size: number; createdAt: Date }[]> {
  try {
    await ensureBackupDirectory();
    const backupDir = getBackupDirectory();
    const files = await FileSystem.readDirectoryAsync(backupDir);

    const backups = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map(async (filename) => {
          const filePath = backupDir + filename;
          const info = await FileSystem.getInfoAsync(filePath);

          return {
            filename,
            size: info.exists && 'size' in info ? info.size : 0,
            createdAt: info.exists && 'modificationTime' in info ? new Date(info.modificationTime * 1000) : new Date(),
          };
        }),
    );

    return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('[Backup] Failed to list backups:', error);
    return [];
  }
}

/**
 * Delete a backup file
 */
export async function deleteBackup(filename: string): Promise<boolean> {
  try {
    const filePath = getBackupDirectory() + filename;
    await FileSystem.deleteAsync(filePath, { idempotent: true });
    console.log(`[Backup] Deleted backup: ${filename}`);
    return true;
  } catch (error) {
    console.error(`[Backup] Failed to delete backup ${filename}:`, error);
    return false;
  }
}

/**
 * Clean up old backups, keeping only the most recent N backups
 */
export async function cleanupOldBackups(keepCount: number = 5): Promise<number> {
  try {
    const backups = await listBackups();

    if (backups.length <= keepCount) {
      return 0;
    }

    const toDelete = backups.slice(keepCount);
    let deletedCount = 0;

    for (const backup of toDelete) {
      const success = await deleteBackup(backup.filename);
      if (success) deletedCount++;
    }

    console.log(`[Backup] Cleaned up ${deletedCount} old backups`);
    return deletedCount;
  } catch (error) {
    console.error('[Backup] Cleanup failed:', error);
    return 0;
  }
}
