/**
 * Social Media Suite Database Operations
 *
 * Database access layer for social media data on mobile.
 * Read-only operations for most entities (synced from desktop).
 * Write operations only for categories and category assignments.
 */

import { dbQuery, dbExecute, getDatabase } from './database';
import { safeJsonParse } from './safe-json';
import { Logger } from './logger';
import type {
  SocialAccount,
  TimelinePost,
  SocialCategory,
  FocusMode,
  TimelineFilters,
  CategoryStats,
  PlatformStats,
  Platform,
} from '../types/social';

// ===== Input Validation =====

/**
 * Validate category name
 */
function validateCategoryName(name: unknown): void {
  if (typeof name !== 'string') {
    throw new Error('Category name must be a string');
  }
  if (name.trim().length === 0) {
    throw new Error('Category name cannot be empty');
  }
  if (name.length > 100) {
    throw new Error('Category name cannot exceed 100 characters');
  }
}

/**
 * Validate color format (hex color)
 */
function validateColor(color: unknown): void {
  if (color === undefined || color === null) {
    return; // Optional field
  }
  if (typeof color !== 'string') {
    throw new Error('Color must be a string');
  }
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexColorRegex.test(color)) {
    throw new Error('Color must be a valid hex color (e.g., #FF5733)');
  }
}

/**
 * Validate icon content (emoji or icon identifier)
 */
function validateIcon(icon: unknown): void {
  if (icon === undefined || icon === null) {
    return; // Optional field
  }
  if (typeof icon !== 'string') {
    throw new Error('Icon must be a string');
  }
  if (icon.length > 50) {
    throw new Error('Icon cannot exceed 50 characters');
  }
}

/**
 * Validate space ID format
 */
function validateSpaceId(spaceId: unknown): void {
  if (typeof spaceId !== 'string') {
    throw new Error('Space ID must be a string');
  }
  if (spaceId.trim().length === 0) {
    throw new Error('Space ID cannot be empty');
  }
  if (spaceId.length > 255) {
    throw new Error('Space ID cannot exceed 255 characters');
  }
}

/**
 * Validate post ID format
 */
function validatePostId(postId: unknown): void {
  if (typeof postId !== 'string') {
    throw new Error('Post ID must be a string');
  }
  if (postId.trim().length === 0) {
    throw new Error('Post ID cannot be empty');
  }
  if (postId.length > 255) {
    throw new Error('Post ID cannot exceed 255 characters');
  }
}

/**
 * Validate category ID format
 */
function validateCategoryId(categoryId: unknown): void {
  if (typeof categoryId !== 'string') {
    throw new Error('Category ID must be a string');
  }
  if (categoryId.trim().length === 0) {
    throw new Error('Category ID cannot be empty');
  }
  if (categoryId.length > 255) {
    throw new Error('Category ID cannot exceed 255 characters');
  }
}

// ===== Database Row Types =====

interface SocialAccountRow {
  id: string;
  space_id: string;
  platform: string;
  username: string;
  display_name: string;
  credentials_encrypted: unknown; // Can be Uint8Array, ArrayBuffer, or string
  enabled: number;
  sync_frequency_minutes: number;
  last_sync: number | null;
  created_at: number;
}

interface SocialPostRow {
  id: string;
  account_id: string;
  platform: string;
  platform_post_id: string;
  author: string;
  author_avatar: string | null;
  content: string;
  content_html: string | null;
  url: string;
  media_urls: string | null;
  engagement_likes: number;
  engagement_comments: number;
  engagement_shares: number;
  engagement_views: number;
  created_at: number;
  collected_at: number;
  account_username: string;
  account_display_name: string;
  category_ids: string | null;
  category_names: string | null;
  category_colors: string | null;
  category_icons: string | null;
}

interface CategoryRow {
  id: string;
  space_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  filters_json: string | null;
  created_at: number;
}

interface FocusModeRow {
  id: string;
  space_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: number;
  blocked_platforms: string | null;
  allowed_platforms: string | null;
  created_at: number;
}

interface SpaceCheckRow {
  post_space: string | null;
  category_space: string | null;
}

interface CategoryFilters {
  platforms?: string[];
  keywords?: string[];
  authors?: string[];
  [key: string]: unknown;
}

interface SyncOperationData {
  id?: string;
  space_id?: string;
  name?: string;
  color?: string;
  icon?: string;
  created_at?: number;
  post_id?: string;
  category_id?: string;
  assigned_at?: number;
  assigned_by?: string;
  [key: string]: unknown;
}

// ===== Social Account Operations (Read-Only) =====

export async function getSocialAccounts(spaceId: string): Promise<SocialAccount[]> {
  const rows = await dbQuery<SocialAccountRow>(
    `SELECT id, space_id, platform, username, display_name, credentials_encrypted,
            enabled, sync_frequency_minutes, last_sync, created_at
     FROM social_account
     WHERE space_id = ?
     ORDER BY platform, username`,
    [spaceId],
  );

  return rows.map((row) => {
    // Safely normalize credentials_encrypted with robust type checking
    let creds: Uint8Array;
    const raw = row.credentials_encrypted;

    if (raw instanceof Uint8Array) {
      creds = raw;
    } else if (raw && typeof raw === 'object' && 'byteLength' in raw && typeof raw.byteLength === 'number') {
      // ArrayBuffer or similar
      creds = new Uint8Array(raw as ArrayBufferLike);
    } else if (raw && typeof raw === 'string') {
      // Some SQLite drivers can yield base64 strings; safely decode without relying on atob in RN
      try {
        let bytes: Uint8Array;
        if (typeof global !== 'undefined' && typeof (global as any).atob === 'function') {
          const bin = (global as any).atob(raw);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          bytes = arr;
        } else if (typeof Buffer !== 'undefined') {
          const buf = Buffer.from(raw, 'base64');
          bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        } else {
          // Fallback: invalid environment for base64 decoding
          bytes = new Uint8Array(0);
        }
        creds = bytes;
      } catch {
        creds = new Uint8Array(0);
      }
    } else {
      creds = new Uint8Array(0);
    }

    return {
      id: row.id,
      space_id: row.space_id,
      platform: row.platform as Platform,
      username: row.username,
      display_name: row.display_name || undefined,
      credentials_encrypted: creds,
      enabled: row.enabled === 1,
      sync_frequency_minutes: row.sync_frequency_minutes,
      last_sync: row.last_sync ?? undefined,
      created_at: row.created_at,
    };
  });
}

export async function getSocialAccount(accountId: string): Promise<SocialAccount | null> {
  const rows = await dbQuery<SocialAccountRow>(
    `SELECT id, space_id, platform, username, display_name, credentials_encrypted,
            enabled, sync_frequency_minutes, last_sync, created_at
     FROM social_account
     WHERE id = ?`,
    [accountId],
  );

  if (rows.length === 0) return null;

  const row = rows[0];

  // Normalize credentials_encrypted robustly (mirror getSocialAccounts)
  let creds: Uint8Array;
  const raw = row.credentials_encrypted;

  if (raw instanceof Uint8Array) {
    creds = raw;
  } else if (raw && typeof raw === 'object' && 'byteLength' in raw && typeof raw.byteLength === 'number') {
    // ArrayBuffer or similar
    creds = new Uint8Array(raw as ArrayBufferLike);
  } else if (raw && typeof raw === 'string') {
    // Some SQLite drivers can yield base64 strings; best-effort decode
    try {
      const bin = atob(raw);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      creds = arr;
    } catch {
      creds = new Uint8Array(0);
    }
  } else {
    creds = new Uint8Array(0);
  }

  return {
    id: row.id,
    space_id: row.space_id,
    platform: row.platform as Platform,
    username: row.username,
    display_name: row.display_name || undefined,
    credentials_encrypted: creds,
    enabled: row.enabled === 1,
    sync_frequency_minutes: row.sync_frequency_minutes,
    last_sync: row.last_sync ?? undefined,
    created_at: row.created_at,
  };
}

// ===== Social Post Operations (Read-Only) =====

export async function getTimelinePosts(
  spaceId: string,
  filters?: TimelineFilters,
  limit: number = 50,
  offset: number = 0,
): Promise<TimelinePost[]> {
  let sql = `
    SELECT
      p.id, p.account_id, p.platform, p.platform_post_id,
      p.author, p.author_avatar, p.content, p.content_html,
      p.url, p.media_urls,
      p.engagement_likes, p.engagement_comments,
      p.engagement_shares, p.engagement_views,
      p.created_at, p.collected_at,
      a.username as account_username,
      a.display_name as account_display_name,
      GROUP_CONCAT(c.id, char(31)) as category_ids,
      GROUP_CONCAT(c.name, char(31)) as category_names,
      GROUP_CONCAT(c.color, char(31)) as category_colors,
      GROUP_CONCAT(c.icon, char(31)) as category_icons
    FROM social_post p
    JOIN social_account a ON p.account_id = a.id
    LEFT JOIN social_post_category pc ON p.id = pc.post_id
    LEFT JOIN social_category c ON pc.category_id = c.id
    WHERE a.space_id = ?
  `;

  const params: (string | number)[] = [spaceId];

  // Add filters
  if (filters?.platforms && filters.platforms.length > 0) {
    sql += ` AND p.platform IN (${filters.platforms.map(() => '?').join(',')})`;
    params.push(...filters.platforms);
  }

  if (filters?.categories && filters.categories.length > 0) {
    // Normalize and validate category IDs
    const catIds = Array.from(
      new Set(filters.categories.map((c) => (typeof c === 'string' ? c.trim() : '')).filter((c) => c.length > 0)),
    );

    if (catIds.length > 0) {
      // Use EXISTS subquery to avoid LEFT JOIN -> INNER JOIN conversion
      sql += ` AND EXISTS (
        SELECT 1
        FROM social_post_category pc2
        JOIN social_category c2 ON pc2.category_id = c2.id
        WHERE pc2.post_id = p.id
          AND c2.space_id = ?
          AND c2.id IN (${catIds.map(() => '?').join(',')})
      )`;
      params.push(spaceId, ...catIds);
    }
  }

  if (filters?.authors && filters.authors.length > 0) {
    const authors = Array.from(
      new Set(filters.authors.map((a) => (typeof a === 'string' ? a.trim() : '')).filter((a) => a.length > 0)),
    );
    if (authors.length > 0) {
      sql += ` AND p.author IN (${authors.map(() => '?').join(',')})`;
      params.push(...authors);
    }
  }

  if (filters?.search_query) {
    const MAX_SEARCH_LENGTH = 200;
    const MIN_SEARCH_LENGTH = 2;
    const sanitized = filters.search_query.trim().slice(0, MAX_SEARCH_LENGTH);

    if (sanitized.length >= MIN_SEARCH_LENGTH) {
      const escapeLike = (s: string) => s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      const escaped = escapeLike(sanitized);
      // If after escaping the query is effectively empty, skip to avoid full scans
      if (escaped.replace(/%|_/g, '').length > 0) {
        sql += ` AND (COALESCE(p.content,'') LIKE ? ESCAPE '\\' OR COALESCE(p.author,'') LIKE ? ESCAPE '\\')`;
        const searchPattern = `%${escaped}%`;
        params.push(searchPattern, searchPattern);
      }
    }
  }

  if (filters?.time_range) {
    sql += ` AND p.created_at BETWEEN ? AND ?`;
    params.push(filters.time_range.start, filters.time_range.end);
  }

  sql += `
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);

  const rows = await dbQuery<SocialPostRow>(sql, params);

  return rows.map((row) => {
    // Safely parse media_urls JSON with validation
    let mediaUrls: string[] | undefined;
    if (row.media_urls != null) {
      try {
        const parsed = typeof row.media_urls === 'string' ? JSON.parse(row.media_urls) : row.media_urls;
        if (Array.isArray(parsed)) {
          mediaUrls = parsed.filter((u) => typeof u === 'string');
        } else {
          mediaUrls = undefined;
        }
      } catch {
        mediaUrls = undefined;
      }
    }

    const nn = (v: unknown): number => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };

    return {
      id: row.id,
      account_id: row.account_id,
      platform: row.platform as Platform,
      platform_post_id: row.platform_post_id,
      author: row.author,
      author_avatar: row.author_avatar ?? undefined,
      content: row.content,
      content_html: row.content_html ?? undefined,
      url: row.url,
      media_urls: mediaUrls,
      engagement: {
        likes: nn(row.engagement_likes),
        comments: nn(row.engagement_comments),
        shares: nn(row.engagement_shares),
        views: nn(row.engagement_views),
      },
      created_at: row.created_at,
      collected_at: row.collected_at,
      account_username: row.account_username,
      account_display_name: row.account_display_name,
      categories: parseCategories(row),
    };
  });
}

function parseCategories(row: SocialPostRow): SocialCategory[] {
  if (!row.category_ids) return [];

  const sep = String.fromCharCode(31);
  // Filter out empty IDs that can result from GROUP_CONCAT on posts with no categories
  const ids = row.category_ids.split(sep).filter((id: string) => id && id.length > 0);
  if (ids.length === 0) return [];

  const names = row.category_names?.split(sep) || [];
  const colors = row.category_colors?.split(sep) || [];
  const icons = row.category_icons?.split(sep) || [];

  return ids.map((id: string, i: number) => ({
    id,
    space_id: '', // Not needed for display
    name: names[i] || '',
    color: colors[i] || undefined,
    icon: icons[i] || undefined,
    filters: undefined,
    created_at: 0,
  }));
}

export async function getPostById(postId: string): Promise<TimelinePost | null> {
  const sql = `
    SELECT
      p.id, p.account_id, p.platform, p.platform_post_id,
      p.author, p.author_avatar, p.content, p.content_html,
      p.url, p.media_urls,
      p.engagement_likes, p.engagement_comments,
      p.engagement_shares, p.engagement_views,
      p.created_at, p.collected_at,
      a.username as account_username,
      a.display_name as account_display_name,
      GROUP_CONCAT(c.id, char(31)) as category_ids,
      GROUP_CONCAT(c.name, char(31)) as category_names,
      GROUP_CONCAT(c.color, char(31)) as category_colors,
      GROUP_CONCAT(c.icon, char(31)) as category_icons
    FROM social_post p
    JOIN social_account a ON p.account_id = a.id
    LEFT JOIN social_post_category pc ON p.id = pc.post_id
    LEFT JOIN social_category c ON pc.category_id = c.id
    WHERE p.id = ?
    GROUP BY p.id
    LIMIT 1
  `;

  const rows = await dbQuery<SocialPostRow>(sql, [postId]);
  if (rows.length === 0) return null;

  const row = rows[0];

  // Safely parse media_urls JSON with validation
  let mediaUrls: string[] | undefined;
  if (row.media_urls != null) {
    try {
      const parsed = typeof row.media_urls === 'string' ? JSON.parse(row.media_urls) : row.media_urls;
      if (Array.isArray(parsed)) {
        mediaUrls = parsed.filter((u) => typeof u === 'string');
      } else {
        mediaUrls = undefined;
      }
    } catch {
      // Invalid JSON, skip media URLs rather than crash
      mediaUrls = undefined;
    }
  }

  return {
    id: row.id,
    account_id: row.account_id,
    platform: row.platform as Platform,
    platform_post_id: row.platform_post_id,
    author: row.author,
    author_avatar: row.author_avatar ?? undefined,
    content: row.content,
    content_html: row.content_html ?? undefined,
    url: row.url,
    media_urls: mediaUrls,
    engagement: {
      likes: row.engagement_likes,
      comments: row.engagement_comments,
      shares: row.engagement_shares,
      views: row.engagement_views,
    },
    created_at: row.created_at,
    collected_at: row.collected_at,
    account_username: row.account_username,
    account_display_name: row.account_display_name,
    categories: parseCategories(row),
  };
}

// ===== Social Category Operations (Read-Write) =====

export async function getCategories(spaceId: string): Promise<SocialCategory[]> {
  const rows = await dbQuery<CategoryRow>(
    `SELECT id, space_id, name, color, icon, filters_json, created_at
     FROM social_category
     WHERE space_id = ?
     ORDER BY name`,
    [spaceId],
  );

  return rows.map((row) => {
    let filters: CategoryFilters | undefined = undefined;
    if (row.filters_json) {
      filters = safeJsonParse(row.filters_json, undefined, true);
      if (filters === undefined) {
        Logger.warn('[SocialDB] Failed to parse category filters', { categoryId: row.id });
      }
    }
    return {
      id: row.id,
      space_id: row.space_id,
      name: row.name,
      color: row.color ?? undefined,
      icon: row.icon ?? undefined,
      filters,
      created_at: row.created_at,
    };
  });
}

export async function createCategory(
  spaceId: string,
  name: string,
  color?: string,
  icon?: string,
): Promise<SocialCategory> {
  try {
    // Input validation
    validateSpaceId(spaceId);
    validateCategoryName(name);
    validateColor(color);
    validateIcon(icon);

    const id = generateId();
    const now = Date.now();

    await dbExecute(
      `INSERT INTO social_category (id, space_id, name, color, icon, filters_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, spaceId, name, color || null, icon || null, null, now],
    );

    // Queue for sync to desktop
    await queueSyncOperation('social_category', id, 'create', {
      id,
      space_id: spaceId,
      name,
      color,
      icon,
      created_at: now,
    });

    Logger.info('[SocialDB] Category created successfully', { categoryId: id, spaceId, name });

    return {
      id,
      space_id: spaceId,
      name,
      color,
      icon,
      created_at: now,
    };
  } catch (error) {
    Logger.error('[SocialDB] Failed to create category', { spaceId, name, error });
    throw error;
  }
}

export async function assignCategory(postId: string, categoryId: string): Promise<void> {
  const db = getDatabase();

  try {
    // Input validation
    validatePostId(postId);
    validateCategoryId(categoryId);

    const now = Date.now();

    // Use transaction for atomic multi-step operation
    await db.execAsync('BEGIN TRANSACTION');

    try {
      // Enforce space isolation: post's space must match category's space
      const rows = await dbQuery<SpaceCheckRow>(
        `
        SELECT
          (SELECT a.space_id
             FROM social_post p
             JOIN social_account a ON p.account_id = a.id
            WHERE p.id = ?) AS post_space,
          (SELECT c.space_id
             FROM social_category c
            WHERE c.id = ?) AS category_space
        `,
        [postId, categoryId],
      );
      const postSpace = rows?.[0]?.post_space;
      const categorySpace = rows?.[0]?.category_space;
      if (!postSpace || !categorySpace || postSpace !== categorySpace) {
        throw new Error('Cross-space category assignment denied');
      }

      await dbExecute(
        `INSERT OR IGNORE INTO social_post_category (post_id, category_id, assigned_at, assigned_by)
         VALUES (?, ?, ?, 'user')`,
        [postId, categoryId, now],
      );

      await queueSyncOperation('social_post_category', `${postId}-${categoryId}`, 'assign', {
        post_id: postId,
        category_id: categoryId,
        assigned_at: now,
        assigned_by: 'user',
      });

      await db.execAsync('COMMIT');

      Logger.info('[SocialDB] Category assigned successfully', { postId, categoryId });
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  } catch (error) {
    Logger.error('[SocialDB] Failed to assign category', { postId, categoryId, error });
    throw error;
  }
}

export async function removeCategory(postId: string, categoryId: string): Promise<void> {
  const db = getDatabase();

  try {
    // Input validation
    validatePostId(postId);
    validateCategoryId(categoryId);

    // Use transaction for atomic multi-step operation
    await db.execAsync('BEGIN TRANSACTION');

    try {
      await dbExecute(
        `DELETE FROM social_post_category
         WHERE post_id = ? AND category_id = ?`,
        [postId, categoryId],
      );

      // Queue for sync to desktop
      await queueSyncOperation('social_post_category', `${postId}-${categoryId}`, 'remove', {
        post_id: postId,
        category_id: categoryId,
      });

      await db.execAsync('COMMIT');

      Logger.info('[SocialDB] Category removed successfully', { postId, categoryId });
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  } catch (error) {
    Logger.error('[SocialDB] Failed to remove category', { postId, categoryId, error });
    throw error;
  }
}

export async function getPostCategories(postId: string): Promise<SocialCategory[]> {
  const rows = await dbQuery<CategoryRow>(
    `SELECT c.id, c.space_id, c.name, c.color, c.icon, c.filters_json, c.created_at
     FROM social_category c
     JOIN social_post_category pc ON c.id = pc.category_id
     WHERE pc.post_id = ?
     ORDER BY c.name`,
    [postId],
  );

  return rows.map((row) => {
    let filters: CategoryFilters | undefined = undefined;
    if (row.filters_json) {
      filters = safeJsonParse(row.filters_json, undefined, true);
      if (filters === undefined) {
        Logger.warn('[SocialDB] Failed to parse post category filters', { postId, categoryId: row.id });
      }
    }
    return {
      id: row.id,
      space_id: row.space_id,
      name: row.name,
      color: row.color ?? undefined,
      icon: row.icon ?? undefined,
      filters,
      created_at: row.created_at,
    };
  });
}

// ===== Focus Mode Operations (Read-Only) =====

// Helper to safely parse platform arrays from database
function safeParsePlatformArray(val: unknown): Platform[] {
  if (!val) return [];
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Array.isArray(parsed) ? parsed.filter((p: any): p is Platform => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

export async function getFocusModes(spaceId: string): Promise<FocusMode[]> {
  const rows = await dbQuery<FocusModeRow>(
    `SELECT id, space_id, name, description, icon, is_active,
            blocked_platforms, allowed_platforms, created_at
     FROM social_focus_mode
     WHERE space_id = ?
     ORDER BY created_at DESC`,
    [spaceId],
  );

  return rows.map((row) => ({
    id: row.id,
    space_id: row.space_id,
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    is_active: row.is_active === 1,
    blocked_platforms: safeParsePlatformArray(row.blocked_platforms),
    allowed_platforms: safeParsePlatformArray(row.allowed_platforms),
    created_at: row.created_at,
  }));
}

export async function getActiveFocusMode(spaceId: string): Promise<FocusMode | null> {
  const rows = await dbQuery<FocusModeRow>(
    `SELECT id, space_id, name, description, icon, is_active,
            blocked_platforms, allowed_platforms, created_at
     FROM social_focus_mode
     WHERE space_id = ? AND is_active = 1
     LIMIT 1`,
    [spaceId],
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    space_id: row.space_id,
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    is_active: true,
    blocked_platforms: safeParsePlatformArray(row.blocked_platforms),
    allowed_platforms: safeParsePlatformArray(row.allowed_platforms),
    created_at: row.created_at,
  };
}

// ===== Analytics Operations =====

export async function getPlatformStats(spaceId: string): Promise<PlatformStats[]> {
  const rows = await dbQuery<{ platform: string; post_count: number }>(
    `SELECT
       p.platform,
       COUNT(*) as post_count
     FROM social_post p
     JOIN social_account a ON p.account_id = a.id
     WHERE a.space_id = ?
     GROUP BY p.platform
     ORDER BY post_count DESC`,
    [spaceId],
  );

  const total = rows.reduce((sum, row) => sum + row.post_count, 0);

  return rows.map((row) => ({
    platform: row.platform as Platform,
    post_count: row.post_count,
    percentage: total > 0 ? (row.post_count / total) * 100 : 0,
    color: getPlatformColor(row.platform),
  }));
}

export async function getCategoryStats(spaceId: string): Promise<CategoryStats[]> {
  const rows = await dbQuery<CategoryStats>(
    `SELECT
       c.id as category_id,
       c.name as category_name,
       c.color,
       COUNT(pc.post_id) as post_count
     FROM social_category c
     LEFT JOIN social_post_category pc ON c.id = pc.category_id
     WHERE c.space_id = ?
     GROUP BY c.id
     ORDER BY post_count DESC`,
    [spaceId],
  );

  return rows;
}

export async function getTotalPostCount(spaceId: string): Promise<number> {
  const rows = await dbQuery<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM social_post p
     JOIN social_account a ON p.account_id = a.id
     WHERE a.space_id = ?`,
    [spaceId],
  );

  return rows[0]?.count || 0;
}

// ===== Helper Functions =====

function generateId(): string {
  // Collision-resistant 128-bit random ID encoded as hex
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback if crypto is unavailable (should not happen in React Native)
  const rand = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
  return `${Date.now().toString(36)}-${rand}`;
}

async function queueSyncOperation(
  entityType: string,
  entityId: string,
  operation: string,
  data: SyncOperationData,
): Promise<void> {
  const id = generateId();
  const now = Date.now();

  await dbExecute(
    `INSERT INTO sync_queue (id, entity_type, entity_id, operation, data, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [id, entityType, entityId, operation, JSON.stringify(data), now],
  );
}

function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    twitter: '#1DA1F2',
    instagram: '#E4405F',
    tiktok: '#000000',
    youtube: '#FF0000',
    linkedin: '#0A66C2',
    reddit: '#FF4500',
    facebook: '#1877F2',
    pinterest: '#E60023',
    mastodon: '#6364FF',
    bluesky: '#0085FF',
    threads: '#000000',
  };

  return colors[platform] || '#999999';
}
