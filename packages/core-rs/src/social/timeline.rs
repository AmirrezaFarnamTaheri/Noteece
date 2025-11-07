use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use super::account::SocialError;
use super::post::Engagement;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelinePost {
    pub id: String,
    pub platform: String,
    pub account_username: String,
    pub author: String,
    pub author_handle: Option<String>,
    pub content: Option<String>,
    pub timestamp: i64,
    pub engagement: Engagement,
    pub categories: Vec<String>,
    pub media_urls: Vec<String>,
    pub post_type: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TimelineFilters {
    pub platforms: Option<Vec<String>>,
    pub categories: Option<Vec<String>>,
    pub after: Option<i64>,
    pub before: Option<i64>,
    pub limit: Option<i64>,
}

/// Get unified timeline across all platforms
///
/// This is the core function that powers the cross-platform social media timeline.
/// It aggregates posts from all enabled accounts in a space and applies filters.
pub fn get_unified_timeline(
    conn: &Connection,
    space_id: &str,
    filters: TimelineFilters,
) -> Result<Vec<TimelinePost>, SocialError> {
    let mut query = String::from(
        "SELECT p.id, p.platform, a.username, p.author, p.author_handle,
                p.content, p.timestamp, p.likes, p.shares, p.comments, p.views,
                p.media_urls_json, p.post_type,
                GROUP_CONCAT(c.name, ',') as categories
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         LEFT JOIN social_post_category pc ON p.id = pc.post_id
         LEFT JOIN social_category c ON pc.category_id = c.id
         WHERE a.space_id = ?1 AND a.enabled = 1",
    );

    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(space_id.to_string())];

    // Apply platform filter
    if let Some(platforms) = filters.platforms {
        if !platforms.is_empty() {
            query.push_str(" AND p.platform IN (");
            for (i, platform) in platforms.iter().enumerate() {
                if i > 0 { query.push_str(", "); }
                query.push('?');
                params.push(Box::new(platform.clone()));
            }
            query.push(')');
        }
    }

    // Apply category filter
    if let Some(categories) = filters.categories {
        if !categories.is_empty() {
            query.push_str(" AND pc.category_id IN (");
            for (i, category) in categories.iter().enumerate() {
                if i > 0 { query.push_str(", "); }
                query.push('?');
                params.push(Box::new(category.clone()));
            }
            query.push(')');
        }
    }

    // Apply time filters
    if let Some(after) = filters.after {
        query.push_str(" AND p.timestamp >= ?");
        params.push(Box::new(after));
    }

    if let Some(before) = filters.before {
        query.push_str(" AND p.timestamp <= ?");
        params.push(Box::new(before));
    }

    query.push_str(" GROUP BY p.id ORDER BY p.timestamp DESC LIMIT ?");
    params.push(Box::new(filters.limit.unwrap_or(100)));

    let mut stmt = conn.prepare(&query)?;
    let posts = stmt.query_map(
        rusqlite::params_from_iter(params.iter().map(|b| b.as_ref())),
        |row| {
            let media_json: Option<String> = row.get(11)?;
            let media_urls = media_json
                .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
                .unwrap_or_default();

            let categories_str: Option<String> = row.get(13)?;
            let categories = categories_str
                .map(|s| s.split(',').map(String::from).collect())
                .unwrap_or_default();

            Ok(TimelinePost {
                id: row.get(0)?,
                platform: row.get(1)?,
                account_username: row.get(2)?,
                author: row.get(3)?,
                author_handle: row.get(4)?,
                content: row.get(5)?,
                timestamp: row.get(6)?,
                engagement: Engagement {
                    likes: row.get(7)?,
                    shares: row.get(8)?,
                    comments: row.get(9)?,
                    views: row.get(10)?,
                },
                media_urls,
                post_type: row.get(12)?,
                categories,
            })
        },
    )?;

    let mut result = Vec::new();
    for post in posts {
        result.push(post?);
    }

    Ok(result)
}

/// Get timeline for a specific category
pub fn get_category_timeline(
    conn: &Connection,
    category_id: &str,
    limit: Option<i64>,
) -> Result<Vec<TimelinePost>, SocialError> {
    let limit = limit.unwrap_or(100);

    let mut stmt = conn.prepare(
        "SELECT p.id, p.platform, a.username, p.author, p.author_handle,
                p.content, p.timestamp, p.likes, p.shares, p.comments, p.views,
                p.media_urls_json, p.post_type,
                GROUP_CONCAT(c.name, ',') as categories
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         JOIN social_post_category pc ON p.id = pc.post_id
         LEFT JOIN social_category c ON pc.category_id = c.id
         WHERE pc.category_id = ?1 AND a.enabled = 1
         GROUP BY p.id
         ORDER BY p.timestamp DESC
         LIMIT ?2",
    )?;

    let posts = stmt.query_map(params![category_id, limit], |row| {
        let media_json: Option<String> = row.get(11)?;
        let media_urls = media_json
            .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
            .unwrap_or_default();

        let categories_str: Option<String> = row.get(13)?;
        let categories = categories_str
            .map(|s| s.split(',').map(String::from).collect())
            .unwrap_or_default();

        Ok(TimelinePost {
            id: row.get(0)?,
            platform: row.get(1)?,
            account_username: row.get(2)?,
            author: row.get(3)?,
            author_handle: row.get(4)?,
            content: row.get(5)?,
            timestamp: row.get(6)?,
            engagement: Engagement {
                likes: row.get(7)?,
                shares: row.get(8)?,
                comments: row.get(9)?,
                views: row.get(10)?,
            },
            media_urls,
            post_type: row.get(12)?,
            categories,
        })
    })?;

    let mut result = Vec::new();
    for post in posts {
        result.push(post?);
    }

    Ok(result)
}

/// Get timeline for a specific platform
pub fn get_platform_timeline(
    conn: &Connection,
    space_id: &str,
    platform: &str,
    limit: Option<i64>,
) -> Result<Vec<TimelinePost>, SocialError> {
    let limit = limit.unwrap_or(100);

    let mut stmt = conn.prepare(
        "SELECT p.id, p.platform, a.username, p.author, p.author_handle,
                p.content, p.timestamp, p.likes, p.shares, p.comments, p.views,
                p.media_urls_json, p.post_type,
                GROUP_CONCAT(c.name, ',') as categories
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         LEFT JOIN social_post_category pc ON p.id = pc.post_id
         LEFT JOIN social_category c ON pc.category_id = c.id
         WHERE a.space_id = ?1 AND p.platform = ?2 AND a.enabled = 1
         GROUP BY p.id
         ORDER BY p.timestamp DESC
         LIMIT ?3",
    )?;

    let posts = stmt.query_map(params![space_id, platform, limit], |row| {
        let media_json: Option<String> = row.get(11)?;
        let media_urls = media_json
            .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
            .unwrap_or_default();

        let categories_str: Option<String> = row.get(13)?;
        let categories = categories_str
            .map(|s| s.split(',').map(String::from).collect())
            .unwrap_or_default();

        Ok(TimelinePost {
            id: row.get(0)?,
            platform: row.get(1)?,
            account_username: row.get(2)?,
            author: row.get(3)?,
            author_handle: row.get(4)?,
            content: row.get(5)?,
            timestamp: row.get(6)?,
            engagement: Engagement {
                likes: row.get(7)?,
                shares: row.get(8)?,
                comments: row.get(9)?,
                views: row.get(10)?,
            },
            media_urls,
            post_type: row.get(12)?,
            categories,
        })
    })?;

    let mut result = Vec::new();
    for post in posts {
        result.push(post?);
    }

    Ok(result)
}

/// Get timeline statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineStats {
    pub total_posts: i64,
    pub platforms_count: i64,
    pub categories_count: i64,
    pub today_posts: i64,
    pub this_week_posts: i64,
}

pub fn get_timeline_stats(
    conn: &Connection,
    space_id: &str,
) -> Result<TimelineStats, SocialError> {
    let now = chrono::Utc::now().timestamp_millis();
    let today_start = now - (now % 86400000); // 86400000 ms = 1 day
    let week_start = today_start - (6 * 86400000); // 6 days

    let total_posts: i64 = conn.query_row(
        "SELECT COUNT(*) FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1",
        [space_id],
        |row| row.get(0),
    )?;

    let platforms_count: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT p.platform) FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1",
        [space_id],
        |row| row.get(0),
    )?;

    let categories_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM social_category WHERE space_id = ?1",
        [space_id],
        |row| row.get(0),
    )?;

    let today_posts: i64 = conn.query_row(
        "SELECT COUNT(*) FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1 AND p.timestamp >= ?2",
        params![space_id, today_start],
        |row| row.get(0),
    )?;

    let this_week_posts: i64 = conn.query_row(
        "SELECT COUNT(*) FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1 AND p.timestamp >= ?2",
        params![space_id, week_start],
        |row| row.get(0),
    )?;

    Ok(TimelineStats {
        total_posts,
        platforms_count,
        categories_count,
        today_posts,
        this_week_posts,
    })
}
