/**
 * Backup and Export Utility
 *
 * Provides comprehensive backup and export functionality for user data.
 * Supports JSON export, import, and automatic backups.
 */

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import { db Execute, dbQuery } from "./database";
import type { SocialAccount, SocialPost, SocialCategory } from "../types/social";

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
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `noteece-backup-${timestamp}.json`;
}

/**
 * Get backup directory path
 */
function getBackupDirectory(): string {
  return `${FileSystem.documentDirectory}backups/`;
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
async function exportAccounts(spaceId: string): Promise<Omit<SocialAccount, "credentials_encrypted">[]> {
  const accounts = await dbQuery<any>(
    `SELECT id, space_id, platform, username, display_name,
            enabled, sync_frequency_minutes, last_sync_time, created_at
     FROM social_account
     WHERE space_id = ?`,
    [spaceId]
  );

  return accounts;
}

/**
 * Export social posts
 */
async function exportPosts(spaceId: string): Promise<any[]> {
  const posts = await dbQuery<any>(
    `SELECT p.*
     FROM social_post p
     JOIN social_account a ON p.account_id = a.id
     WHERE a.space_id = ?
     ORDER BY p.created_at DESC`,
    [spaceId]
  );

  return posts;
}

/**
 * Export categories with their filters
 */
async function exportCategories(spaceId: string): Promise<any[]> {
  const categories = await dbQuery<any>(
    `SELECT id, space_id, name, color, icon, filters_json, created_at
     FROM social_category
     WHERE space_id = ?`,
    [spaceId]
  );

  return categories;
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
  } = {}
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const {
      includeAccounts = true,
      includePosts = true,
      includeCategories = true,
      includeSettings = true,
    } = options;

    await ensureBackupDirectory();

    const metadata: BackupMetadata = {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      deviceId: "mobile", // TODO: Get actual device ID
      platform: "mobile",
      dataTypes: [],
    };

    const backupData: Partial<BackupData> = { metadata };

    // Export accounts (without credentials)
    if (includeAccounts) {
      backupData.accounts = await exportAccounts(spaceId);
      metadata.dataTypes.push("accounts");
    }

    // Export posts
    if (includePosts) {
      backupData.posts = await exportPosts(spaceId);
      metadata.dataTypes.push("posts");
    }

    // Export categories
    if (includeCategories) {
      backupData.categories = await exportCategories(spaceId);
      metadata.dataTypes.push("categories");
    }

    // Export settings (if applicable)
    if (includeSettings) {
      // TODO: Export app settings
      backupData.settings = {};
      metadata.dataTypes.push("settings");
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
    console.error("[Backup] Failed to create backup:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
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
      Alert.alert("Export Failed", result.error || "Failed to create backup");
      return;
    }

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        "Sharing Not Available",
        `Backup saved to: ${result.filePath}\n\nPlease copy this file manually.`
      );
      return;
    }

    // Share the backup file
    await Sharing.shareAsync(result.filePath, {
      mimeType: "application/json",
      dialogTitle: "Export Noteece Backup",
      UTI: "public.json",
    });
  } catch (error) {
    console.error("[Backup] Export failed:", error);
    Alert.alert(
      "Export Failed",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

/**
 * Import backup from JSON data
 */
export async function importBackup(
  backupJson: string,
  options: {
    mergeStrategy?: "replace" | "merge" | "skip";
    validateOnly?: boolean;
  } = {}
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
    const { mergeStrategy = "merge", validateOnly = false } = options;

    // Parse backup data
    const backupData: BackupData = JSON.parse(backupJson);

    // Validate backup structure
    if (!backupData.metadata || !backupData.metadata.version) {
      throw new Error("Invalid backup format: missing metadata");
    }

    // Version compatibility check
    const [major] = backupData.metadata.version.split(".");
    if (major !== "1") {
      throw new Error(
        `Incompatible backup version: ${backupData.metadata.version}`
      );
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
          if (mergeStrategy === "replace") {
            // Delete existing and insert new
            await dbExecute("DELETE FROM social_category WHERE id = ?", [
              category.id,
            ]);
          }

          await dbExecute(
            `INSERT OR ${mergeStrategy === "skip" ? "IGNORE" : "REPLACE"} INTO social_category
             (id, space_id, name, color, icon, filters_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              category.id,
              category.space_id,
              category.name,
              category.color,
              category.icon,
              category.filters_json,
              category.created_at,
            ]
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
          if (mergeStrategy === "replace") {
            await dbExecute("DELETE FROM social_account WHERE id = ?", [
              account.id,
            ]);
          }

          await dbExecute(
            `INSERT OR ${mergeStrategy === "skip" ? "IGNORE" : "REPLACE"} INTO social_account
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
              account.last_sync_time,
              account.created_at,
            ]
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
          if (mergeStrategy === "replace") {
            await dbExecute("DELETE FROM social_post WHERE id = ?", [post.id]);
          }

          await dbExecute(
            `INSERT OR ${mergeStrategy === "skip" ? "IGNORE" : "REPLACE"} INTO social_post
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
              post.author_handle,
              post.content,
              post.content_html,
              post.url,
              post.media_urls_json,
              post.engagement_likes || 0,
              post.engagement_comments || 0,
              post.engagement_shares || 0,
              post.engagement_views || 0,
              post.created_at,
              post.collected_at,
              post.post_type,
              post.reply_to,
              post.raw_json,
            ]
          );

          imported.posts++;
        } catch (error) {
          console.error(`[Backup] Failed to import post ${post.id}:`, error);
        }
      }
    }

    console.log("[Backup] Import completed:", imported);

    return { success: true, imported };
  } catch (error) {
    console.error("[Backup] Import failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<
  Array<{ filename: string; size: number; createdAt: Date }>
> {
  try {
    await ensureBackupDirectory();
    const backupDir = getBackupDirectory();
    const files = await FileSystem.readDirectoryAsync(backupDir);

    const backups = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (filename) => {
          const filePath = backupDir + filename;
          const info = await FileSystem.getInfoAsync(filePath);

          return {
            filename,
            size: info.exists && "size" in info ? info.size : 0,
            createdAt: info.exists && "modificationTime" in info
              ? new Date(info.modificationTime * 1000)
              : new Date(),
          };
        })
    );

    return backups.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  } catch (error) {
    console.error("[Backup] Failed to list backups:", error);
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
    console.error("[Backup] Cleanup failed:", error);
    return 0;
  }
}
