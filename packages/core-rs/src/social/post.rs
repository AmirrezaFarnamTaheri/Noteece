use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

use super::account::SocialError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocialPost {
    pub id: String,
    pub account_id: String,
    pub platform: String,
    pub platform_post_id: Option<String>,
    pub author: String,
    pub author_handle: Option<String>,
    pub content: Option<String>,
    pub content_html: Option<String>,
    pub media_urls: Vec<String>,
    pub timestamp: i64,
    pub fetched_at: i64,
    pub engagement: Engagement,
    pub post_type: Option<String>,
    pub reply_to: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Engagement {
    pub likes: Option<i64>,
    pub shares: Option<i64>,
    pub comments: Option<i64>,
    pub views: Option<i64>,
}

/// Store social posts extracted from platforms
///
/// This function handles batch insertion of posts with deduplication.
/// Posts with the same (account_id, platform_post_id) are skipped.
pub fn store_social_posts(
    conn: &Connection,
    account_id: &str,
    posts: Vec<SocialPost>,
) -> Result<usize, SocialError> {
    const MAX_MEDIA_JSON_SIZE: usize = 100_000; // 100KB limit
    const MAX_RAW_JSON_SIZE: usize = 500_000; // 500KB limit

    log::debug!(
        "[Social::Post] Storing {} posts for account {}",
        posts.len(),
        account_id
    );

    let now = Utc::now().timestamp_millis();
    let mut stored = 0;

    // Use transaction for atomicity
    log::debug!("[Social::Post] Starting transaction for batch insert");
    let tx = conn.unchecked_transaction().map_err(|e| {
        log::error!("[Social::Post] Failed to start transaction: {}", e);
        e
    })?;

    for post in posts {
        let post_id = Ulid::new().to_string();

        // Cap media JSON size to prevent OOM
        let mut media_json = serde_json::to_string(&post.media_urls)?;
        if media_json.len() > MAX_MEDIA_JSON_SIZE {
            log::warn!("Post media JSON exceeds size limit, truncating media list");
            let truncated_media = post
                .media_urls
                .iter()
                .take(100) // Limit to 100 media items
                .cloned()
                .collect::<Vec<_>>();
            media_json = serde_json::to_string(&truncated_media)?;
            if media_json.len() > MAX_MEDIA_JSON_SIZE {
                continue; // Skip post if still too large
            }
        }

        // Cap raw JSON size
        let raw_json = serde_json::to_string(&post)?;
        if raw_json.len() > MAX_RAW_JSON_SIZE {
            log::warn!("Post raw JSON exceeds size limit, skipping");
            continue;
        }

        // Try to insert, skip if duplicate
        match tx.execute(
            "INSERT OR IGNORE INTO social_post (
                id, account_id, platform, platform_post_id,
                author, author_handle, content, content_html,
                media_urls_json, timestamp, fetched_at,
                likes, shares, comments, views,
                post_type, reply_to, raw_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            params![
                &post_id,
                account_id,
                &post.platform,
                post.platform_post_id,
                &post.author,
                post.author_handle,
                post.content,
                post.content_html,
                &media_json,
                post.timestamp,
                now,
                post.engagement.likes,
                post.engagement.shares,
                post.engagement.comments,
                post.engagement.views,
                post.post_type,
                post.reply_to,
                &raw_json,
            ],
        ) {
            Ok(rows) if rows > 0 => {
                stored += rows;
                // FTS index is automatically updated by triggers
            }
            Ok(_) => {
                // Post already exists (INSERT OR IGNORE), not an error
            }
            Err(e) => {
                // Don't log sensitive post IDs, just log sanitized error
                log::warn!("Failed to store social post: {}", e);
            }
        }
    }

    // Commit transaction
    log::debug!(
        "[Social::Post] Committing transaction with {} posts stored",
        stored
    );
    tx.commit().map_err(|e| {
        log::error!("[Social::Post] Failed to commit transaction: {}", e);
        e
    })?;

    // Update account last_sync timestamp
    if stored > 0 {
        log::debug!(
            "[Social::Post] Updating last_sync for account {}",
            account_id
        );
        super::account::update_last_sync(conn, account_id)?;
    }

    log::info!(
        "[Social::Post] Successfully stored {} out of {} posts for account {}",
        stored,
        posts.len(),
        account_id
    );

    Ok(stored)
}

/// Get social posts for an account
pub fn get_social_posts(
    conn: &Connection,
    account_id: &str,
    limit: Option<i64>,
) -> Result<Vec<SocialPost>, SocialError> {
    let limit = limit.unwrap_or(100);

    log::debug!(
        "[Social::Post] Fetching up to {} posts for account {}",
        limit,
        account_id
    );

    let mut stmt = conn
        .prepare(
            "SELECT id, account_id, platform, platform_post_id,
                author, author_handle, content, content_html,
                media_urls_json, timestamp, fetched_at,
                likes, shares, comments, views,
                post_type, reply_to
         FROM social_post
         WHERE account_id = ?1
         ORDER BY timestamp DESC
         LIMIT ?2",
        )
        .map_err(|e| {
            log::error!("[Social::Post] Failed to prepare query: {}", e);
            e
        })?;

    let posts = stmt.query_map(params![account_id, limit], |row| {
        let media_json: Option<String> = row.get(8)?;
        let media_urls = media_json
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();

        Ok(SocialPost {
            id: row.get(0)?,
            account_id: row.get(1)?,
            platform: row.get(2)?,
            platform_post_id: row.get(3)?,
            author: row.get(4)?,
            author_handle: row.get(5)?,
            content: row.get(6)?,
            content_html: row.get(7)?,
            media_urls,
            timestamp: row.get(9)?,
            fetched_at: row.get(10)?,
            engagement: Engagement {
                likes: row.get(11)?,
                shares: row.get(12)?,
                comments: row.get(13)?,
                views: row.get(14)?,
            },
            post_type: row.get(15)?,
            reply_to: row.get(16)?,
        })
    })?;

    let mut result = Vec::new();
    for post in posts {
        result.push(post?);
    }

    log::info!(
        "[Social::Post] Retrieved {} posts for account {}",
        result.len(),
        account_id
    );

    Ok(result)
}

/// Search posts by content
pub fn search_social_posts(
    conn: &Connection,
    space_id: &str,
    query: &str,
    limit: Option<i64>,
) -> Result<Vec<SocialPost>, SocialError> {
    let limit = limit.unwrap_or(100);

    log::debug!(
        "[Social::Post] Searching posts in space {} with query '{}', limit={}",
        space_id,
        query,
        limit
    );

    let mut stmt = conn.prepare(
        "SELECT p.id, p.account_id, p.platform, p.platform_post_id,
                p.author, p.author_handle, p.content, p.content_html,
                p.media_urls_json, p.timestamp, p.fetched_at,
                p.likes, p.shares, p.comments, p.views,
                p.post_type, p.reply_to
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1
           AND p.id IN (
               SELECT post_id FROM social_post_fts
               WHERE social_post_fts MATCH ?2
           )
         ORDER BY p.timestamp DESC
         LIMIT ?3",
    )?;

    let posts = stmt.query_map(params![space_id, query, limit], |row| {
        let media_json: Option<String> = row.get(8)?;
        let media_urls = media_json
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();

        Ok(SocialPost {
            id: row.get(0)?,
            account_id: row.get(1)?,
            platform: row.get(2)?,
            platform_post_id: row.get(3)?,
            author: row.get(4)?,
            author_handle: row.get(5)?,
            content: row.get(6)?,
            content_html: row.get(7)?,
            media_urls,
            timestamp: row.get(9)?,
            fetched_at: row.get(10)?,
            engagement: Engagement {
                likes: row.get(11)?,
                shares: row.get(12)?,
                comments: row.get(13)?,
                views: row.get(14)?,
            },
            post_type: row.get(15)?,
            reply_to: row.get(16)?,
        })
    })?;

    let mut result = Vec::new();
    for post in posts {
        result.push(post?);
    }

    log::info!(
        "[Social::Post] Search returned {} posts for query '{}'",
        result.len(),
        query
    );

    Ok(result)
}

/// Delete old posts to manage storage
pub fn delete_old_posts(
    conn: &Connection,
    account_id: &str,
    before_timestamp: i64,
) -> Result<usize, SocialError> {
    log::debug!(
        "[Social::Post] Deleting posts for account {} before timestamp {}",
        account_id,
        before_timestamp
    );

    let deleted = conn
        .execute(
            "DELETE FROM social_post
         WHERE account_id = ?1 AND timestamp < ?2",
            params![account_id, before_timestamp],
        )
        .map_err(|e| {
            log::error!("[Social::Post] Failed to delete old posts: {}", e);
            e
        })?;

    log::info!(
        "[Social::Post] Deleted {} old posts for account {}",
        deleted,
        account_id
    );

    Ok(deleted)
}

/// Get post count statistics per platform
pub fn get_post_statistics(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<(String, i64)>, SocialError> {
    log::debug!(
        "[Social::Post] Fetching post statistics for space {}",
        space_id
    );

    let mut stmt = conn
        .prepare(
            "SELECT p.platform, COUNT(*) as count
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1
         GROUP BY p.platform
         ORDER BY count DESC",
        )
        .map_err(|e| {
            log::error!("[Social::Post] Failed to prepare statistics query: {}", e);
            e
        })?;

    let stats = stmt.query_map([space_id], |row| Ok((row.get(0)?, row.get(1)?)))?;

    let mut result = Vec::new();
    for stat in stats {
        result.push(stat?);
    }

    log::info!(
        "[Social::Post] Retrieved statistics for {} platforms",
        result.len()
    );

    Ok(result)
}
