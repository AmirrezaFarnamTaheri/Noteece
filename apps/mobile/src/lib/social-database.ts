/**
 * Social Media Suite Database Operations
 *
 * Database access layer for social media data on mobile.
 * Read-only operations for most entities (synced from desktop).
 * Write operations only for categories and category assignments.
 */

import { dbQuery, dbExecute } from "./database";
import type {
  SocialAccount,
  SocialPost,
  TimelinePost,
  SocialCategory,
  PostCategory,
  FocusMode,
  AutomationRule,
  SyncHistory,
  TimelineFilters,
  CategoryStats,
  PlatformStats,
  Platform,
} from "../types/social";

// ===== Social Account Operations (Read-Only) =====

export async function getSocialAccounts(
  spaceId: string,
): Promise<SocialAccount[]> {
  const rows = await dbQuery<any>(
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
    } else if (raw && typeof raw.byteLength === "number") {
      // ArrayBuffer or similar
      creds = new Uint8Array(raw);
    } else if (raw && typeof raw === "string") {
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
      ...row,
      enabled: row.enabled === 1,
      credentials_encrypted: creds,
    };
  });
}

export async function getSocialAccount(
  accountId: string,
): Promise<SocialAccount | null> {
  const rows = await dbQuery<any>(
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
  } else if (raw && typeof raw.byteLength === "number") {
    // ArrayBuffer or similar
    creds = new Uint8Array(raw);
  } else if (raw && typeof raw === "string") {
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
    ...row,
    enabled: row.enabled === 1,
    credentials_encrypted: creds,
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

  const params: any[] = [spaceId];

  // Add filters
  if (filters?.platforms && filters.platforms.length > 0) {
    sql += ` AND p.platform IN (${filters.platforms.map(() => "?").join(",")})`;
    params.push(...filters.platforms);
  }

  if (filters?.categories && filters.categories.length > 0) {
    // Use EXISTS subquery to avoid LEFT JOIN -> INNER JOIN conversion
    sql += ` AND EXISTS (
      SELECT 1
      FROM social_post_category pc2
      JOIN social_category c2 ON pc2.category_id = c2.id
      WHERE pc2.post_id = p.id
        AND c2.space_id = ?
        AND c2.id IN (${filters.categories.map(() => "?").join(",")})
    )`;
    params.push(spaceId, ...filters.categories);
  }

  if (filters?.authors && filters.authors.length > 0) {
    sql += ` AND p.author IN (${filters.authors.map(() => "?").join(",")})`;
    params.push(...filters.authors);
  }

  if (filters?.search_query) {
    // Limit search query length to prevent DoS via expensive full-scan queries
    const MAX_SEARCH_LENGTH = 200;
    const sanitized = filters.search_query.trim().slice(0, MAX_SEARCH_LENGTH);

    if (sanitized.length > 0) {
      // Escape SQL LIKE wildcard characters to prevent unintended pattern matching
      const escapeLike = (s: string) =>
        s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
      const escaped = escapeLike(sanitized);
      sql += ` AND (p.content LIKE ? ESCAPE '\\' OR p.author LIKE ? ESCAPE '\\')`;
      const searchPattern = `%${escaped}%`;
      params.push(searchPattern, searchPattern);
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

  const rows = await dbQuery<any>(sql, params);

  return rows.map((row) => {
    // Safely parse media_urls JSON with validation
    let mediaUrls: string[] | undefined;
    if (row.media_urls != null) {
      try {
        const parsed = typeof row.media_urls === "string"
          ? JSON.parse(row.media_urls)
          : row.media_urls;
        if (Array.isArray(parsed)) {
          mediaUrls = parsed.filter((u) => typeof u === "string");
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
      author_avatar: row.author_avatar,
      content: row.content,
      content_html: row.content_html,
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
  });
}

function parseCategories(row: any): SocialCategory[] {
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
    space_id: "", // Not needed for display
    name: names[i] || "",
    color: colors[i] || undefined,
    icon: icons[i] || undefined,
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

  const rows = await dbQuery<any>(sql, [postId]);
  if (rows.length === 0) return null;

  const row = rows[0];

  // Safely parse media_urls JSON with validation
  let mediaUrls: string[] | undefined;
  if (row.media_urls != null) {
    try {
      const parsed = typeof row.media_urls === "string"
        ? JSON.parse(row.media_urls)
        : row.media_urls;
      if (Array.isArray(parsed)) {
        mediaUrls = parsed.filter((u) => typeof u === "string");
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
    author_avatar: row.author_avatar,
    content: row.content,
    content_html: row.content_html,
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

export async function getCategories(
  spaceId: string,
): Promise<SocialCategory[]> {
  const rows = await dbQuery<any>(
    `SELECT id, space_id, name, color, icon, filters_json, created_at
     FROM social_category
     WHERE space_id = ?
     ORDER BY name`,
    [spaceId],
  );

  return rows.map((row) => ({
    ...row,
    filters: row.filters_json ? JSON.parse(row.filters_json) : undefined,
  }));
}

export async function createCategory(
  spaceId: string,
  name: string,
  color?: string,
  icon?: string,
): Promise<SocialCategory> {
  const id = generateId();
  const now = Date.now();

  await dbExecute(
    `INSERT INTO social_category (id, space_id, name, color, icon, filters_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, spaceId, name, color || null, icon || null, null, now],
  );

  // Queue for sync to desktop
  await queueSyncOperation("social_category", id, "create", {
    id,
    space_id: spaceId,
    name,
    color,
    icon,
    created_at: now,
  });

  return {
    id,
    space_id: spaceId,
    name,
    color,
    icon,
    created_at: now,
  };
}

export async function assignCategory(
  postId: string,
  categoryId: string,
): Promise<void> {
  const now = Date.now();

  await dbExecute(
    `INSERT OR IGNORE INTO social_post_category (post_id, category_id, assigned_at, assigned_by)
     VALUES (?, ?, ?, 'user')`,
    [postId, categoryId, now],
  );

  // Queue for sync to desktop
  await queueSyncOperation("social_post_category", `${postId}-${categoryId}`, "assign", {
    post_id: postId,
    category_id: categoryId,
    assigned_at: now,
    assigned_by: "user",
  });
}

export async function removeCategory(
  postId: string,
  categoryId: string,
): Promise<void> {
  await dbExecute(
    `DELETE FROM social_post_category
     WHERE post_id = ? AND category_id = ?`,
    [postId, categoryId],
  );

  // Queue for sync to desktop
  await queueSyncOperation("social_post_category", `${postId}-${categoryId}`, "remove", {
    post_id: postId,
    category_id: categoryId,
  });
}

export async function getPostCategories(
  postId: string,
): Promise<SocialCategory[]> {
  const rows = await dbQuery<any>(
    `SELECT c.id, c.space_id, c.name, c.color, c.icon, c.filters_json, c.created_at
     FROM social_category c
     JOIN social_post_category pc ON c.id = pc.category_id
     WHERE pc.post_id = ?
     ORDER BY c.name`,
    [postId],
  );

  return rows.map((row) => ({
    ...row,
    filters: row.filters_json ? JSON.parse(row.filters_json) : undefined,
  }));
}

// ===== Focus Mode Operations (Read-Only) =====

// Helper to safely parse platform arrays from database
function safeParsePlatformArray(val: any): Platform[] {
  if (!val) return [];
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

export async function getFocusModes(spaceId: string): Promise<FocusMode[]> {
  const rows = await dbQuery<any>(
    `SELECT id, space_id, name, description, icon, is_active,
            blocked_platforms, allowed_platforms, created_at
     FROM social_focus_mode
     WHERE space_id = ?
     ORDER BY created_at DESC`,
    [spaceId],
  );

  return rows.map((row) => ({
    ...row,
    is_active: row.is_active === 1,
    blocked_platforms: safeParsePlatformArray(row.blocked_platforms),
    allowed_platforms: safeParsePlatformArray(row.allowed_platforms),
  }));
}

export async function getActiveFocusMode(
  spaceId: string,
): Promise<FocusMode | null> {
  const rows = await dbQuery<any>(
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
    ...row,
    is_active: true,
    blocked_platforms: safeParsePlatformArray(row.blocked_platforms),
    allowed_platforms: safeParsePlatformArray(row.allowed_platforms),
  };
}

// ===== Analytics Operations =====

export async function getPlatformStats(
  spaceId: string,
): Promise<PlatformStats[]> {
  const rows = await dbQuery<any>(
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

export async function getCategoryStats(
  spaceId: string,
): Promise<CategoryStats[]> {
  const rows = await dbQuery<any>(
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
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback if crypto is unavailable (should not happen in React Native)
  const rand = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
  return `${Date.now().toString(36)}-${rand}`;
}

async function queueSyncOperation(
  entityType: string,
  entityId: string,
  operation: string,
  data: any,
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
    twitter: "#1DA1F2",
    instagram: "#E4405F",
    tiktok: "#000000",
    youtube: "#FF0000",
    linkedin: "#0A66C2",
    reddit: "#FF4500",
    facebook: "#1877F2",
    pinterest: "#E60023",
    mastodon: "#6364FF",
    bluesky: "#0085FF",
    threads: "#000000",
  };

  return colors[platform] || "#999999";
}
