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
    let now = Utc::now().timestamp();
    let mut stored = 0;

    for post in posts {
        let post_id = Ulid::new().to_string();
        let media_json = serde_json::to_string(&post.media_urls)?;
        let raw_json = serde_json::to_string(&post)?;

        // Try to insert, skip if duplicate
        match conn.execute(
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
            Ok(rows) => {
                stored += rows;

                // Also update FTS index if post has content
                if let Some(content) = &post.content {
                    let _ = conn.execute(
                        "INSERT INTO social_post_fts (rowid, content, author)
                         SELECT ROWID, ?, ? FROM social_post WHERE id = ?",
                        params![content, &post.author, &post_id],
                    );
                }
            }
            Err(e) => {
                log::warn!("Failed to store post {}: {}", post.platform_post_id.as_ref().unwrap_or(&"unknown".to_string()), e);
            }
        }
    }

    // Update account last_sync timestamp
    if stored > 0 {
        super::account::update_last_sync(conn, account_id)?;
    }

    Ok(stored)
}

/// Get social posts for an account
pub fn get_social_posts(
    conn: &Connection,
    account_id: &str,
    limit: Option<i64>,
) -> Result<Vec<SocialPost>, SocialError> {
    let limit = limit.unwrap_or(100);

    let mut stmt = conn.prepare(
        "SELECT id, account_id, platform, platform_post_id,
                author, author_handle, content, content_html,
                media_urls_json, timestamp, fetched_at,
                likes, shares, comments, views,
                post_type, reply_to
         FROM social_post
         WHERE account_id = ?1
         ORDER BY timestamp DESC
         LIMIT ?2",
    )?;

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
               SELECT rowid FROM social_post_fts
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

    Ok(result)
}

/// Delete old posts to manage storage
pub fn delete_old_posts(
    conn: &Connection,
    account_id: &str,
    before_timestamp: i64,
) -> Result<usize, SocialError> {
    let deleted = conn.execute(
        "DELETE FROM social_post
         WHERE account_id = ?1 AND timestamp < ?2",
        params![account_id, before_timestamp],
    )?;

    Ok(deleted)
}

/// Get post count statistics per platform
pub fn get_post_statistics(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<(String, i64)>, SocialError> {
    let mut stmt = conn.prepare(
        "SELECT p.platform, COUNT(*) as count
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1
         GROUP BY p.platform
         ORDER BY count DESC",
    )?;

    let stats = stmt.query_map([space_id], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })?;

    let mut result = Vec::new();
    for stat in stats {
        result.push(stat?);
    }

    Ok(result)
}
