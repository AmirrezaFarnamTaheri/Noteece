/**
 * Social Media Suite API
 *
 * TypeScript wrapper for Tauri commands
 */

import { invoke } from '@tauri-apps/api';
import type {
  SocialAccount,
  SocialPost,
  TimelinePost,
  TimelineFilters,
  SocialCategory,
  TimelineStats,
} from '@noteece/types';

/**
 * Add a new social media account
 */
export async function addSocialAccount(
  spaceId: string,
  platform: string,
  username: string,
  displayName: string | null,
  credentials: string
): Promise<SocialAccount> {
  return await invoke('add_social_account_cmd', {
    spaceId,
    platform,
    username,
    display_name: displayName,
    credentials,
  });
}

/**
 * Get all social accounts for a space
 */
export async function getSocialAccounts(spaceId: string): Promise<SocialAccount[]> {
  return await invoke('get_social_accounts_cmd', { spaceId });
}

/**
 * Get a single social account by ID
 */
export async function getSocialAccount(accountId: string): Promise<SocialAccount | null> {
  return await invoke('get_social_account_cmd', { accountId });
}

/**
 * Update social account settings
 */
export async function updateSocialAccount(
  accountId: string,
  options: {
    enabled?: boolean;
    syncFrequencyMinutes?: number;
    displayName?: string | null;
  }
): Promise<void> {
  return await invoke('update_social_account_cmd', {
    accountId,
    enabled: options.enabled,
    sync_frequency_minutes: options.syncFrequencyMinutes,
    display_name: options.displayName,
  });
}

/**
 * Delete a social account
 */
export async function deleteSocialAccount(accountId: string): Promise<void> {
  return await invoke('delete_social_account_cmd', { accountId });
}

/**
 * Store social posts (bulk insert from extractors)
 */
export async function storeSocialPosts(
  accountId: string,
  posts: SocialPost[]
): Promise<number> {
  return await invoke('store_social_posts_cmd', { accountId, posts });
}

/**
 * Get unified timeline across all platforms
 */
export async function getUnifiedTimeline(
  spaceId: string,
  filters: TimelineFilters = {}
): Promise<TimelinePost[]> {
  return await invoke('get_unified_timeline_cmd', {
    spaceId,
    filters,
  });
}

/**
 * Create a new category
 */
export async function createSocialCategory(
  spaceId: string,
  name: string,
  color?: string | null,
  icon?: string | null,
  keywords?: string[] | null
): Promise<SocialCategory> {
  return await invoke('create_social_category_cmd', {
    spaceId,
    name,
    color,
    icon,
    keywords,
  });
}

/**
 * Get all categories for a space
 */
export async function getSocialCategories(spaceId: string): Promise<SocialCategory[]> {
  return await invoke('get_social_categories_cmd', { spaceId });
}

/**
 * Assign a category to a post
 */
export async function assignSocialCategory(
  postId: string,
  categoryId: string,
  assignedBy: 'user' | 'auto' | 'ai'
): Promise<void> {
  return await invoke('assign_social_category_cmd', {
    postId,
    categoryId,
    assignedBy,
  });
}

/**
 * Delete a category
 */
export async function deleteSocialCategory(categoryId: string): Promise<void> {
  return await invoke('delete_social_category_cmd', { categoryId });
}

/**
 * Get timeline statistics
 */
export async function getTimelineStats(spaceId: string): Promise<TimelineStats> {
  return await invoke('get_timeline_stats_cmd', { spaceId });
}
