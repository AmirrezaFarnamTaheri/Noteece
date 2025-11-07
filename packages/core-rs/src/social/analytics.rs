use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use super::account::SocialError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformStats {
    pub platform: String,
    pub post_count: i64,
    pub total_likes: i64,
    pub total_comments: i64,
    pub total_views: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSeriesPoint {
    pub date: String, // YYYY-MM-DD format
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryStats {
    pub category_name: String,
    pub post_count: i64,
    pub avg_likes: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngagementStats {
    pub total_posts: i64,
    pub total_likes: i64,
    pub total_comments: i64,
    pub total_shares: i64,
    pub total_views: i64,
    pub avg_engagement_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsOverview {
    pub platform_stats: Vec<PlatformStats>,
    pub time_series: Vec<TimeSeriesPoint>,
    pub category_stats: Vec<CategoryStats>,
    pub engagement: EngagementStats,
    pub top_posts: Vec<TopPost>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopPost {
    pub id: String,
    pub platform: String,
    pub author: String,
    pub content: String,
    pub engagement_score: i64,
    pub timestamp: i64,
}

/// Get analytics overview for a space
pub fn get_analytics_overview(
    conn: &Connection,
    space_id: &str,
    days: i64,
) -> Result<AnalyticsOverview, SocialError> {
    let platform_stats = get_platform_stats(conn, space_id, days)?;
    let time_series = get_time_series(conn, space_id, days)?;
    let category_stats = get_category_stats(conn, space_id, days)?;
    let engagement = get_engagement_stats(conn, space_id, days)?;
    let top_posts = get_top_posts(conn, space_id, days)?;

    Ok(AnalyticsOverview {
        platform_stats,
        time_series,
        category_stats,
        engagement,
        top_posts,
    })
}

/// Get stats per platform
fn get_platform_stats(
    conn: &Connection,
    space_id: &str,
    days: i64,
) -> Result<Vec<PlatformStats>, SocialError> {
    let cutoff = chrono::Utc::now().timestamp_millis() - (days * 24 * 60 * 60 * 1000);

    let mut stmt = conn.prepare(
        "SELECT p.platform,
                COUNT(*) as post_count,
                COALESCE(SUM(p.likes), 0) as total_likes,
                COALESCE(SUM(p.comments), 0) as total_comments,
                COALESCE(SUM(p.views), 0) as total_views
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1 AND p.timestamp >= ?2
         GROUP BY p.platform
         ORDER BY post_count DESC",
    )?;

    let stats = stmt.query_map([space_id, &cutoff.to_string()], |row| {
        Ok(PlatformStats {
            platform: row.get(0)?,
            post_count: row.get(1)?,
            total_likes: row.get(2)?,
            total_comments: row.get(3)?,
            total_views: row.get(4)?,
        })
    })?;

    let mut result = Vec::new();
    for stat in stats {
        result.push(stat?);
    }

    Ok(result)
}

/// Get time series data
fn get_time_series(
    conn: &Connection,
    space_id: &str,
    days: i64,
) -> Result<Vec<TimeSeriesPoint>, SocialError> {
    let cutoff = chrono::Utc::now().timestamp_millis() - (days * 24 * 60 * 60 * 1000);

    let mut stmt = conn.prepare(
        "SELECT DATE(p.timestamp / 1000, 'unixepoch') as date,
                COUNT(*) as count
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1 AND p.timestamp >= ?2
         GROUP BY date
         ORDER BY date ASC",
    )?;

    let points = stmt.query_map([space_id, &cutoff.to_string()], |row| {
        Ok(TimeSeriesPoint {
            date: row.get(0)?,
            count: row.get(1)?,
        })
    })?;

    let mut result = Vec::new();
    for point in points {
        result.push(point?);
    }

    Ok(result)
}

/// Get category stats
fn get_category_stats(
    conn: &Connection,
    space_id: &str,
    days: i64,
) -> Result<Vec<CategoryStats>, SocialError> {
    let cutoff = chrono::Utc::now().timestamp_millis() - (days * 24 * 60 * 60 * 1000);

    let mut stmt = conn.prepare(
        "SELECT c.name,
                COUNT(DISTINCT p.id) as post_count,
                AVG(COALESCE(p.likes, 0)) as avg_likes
         FROM social_category c
         JOIN social_post_category pc ON c.id = pc.category_id
         JOIN social_post p ON pc.post_id = p.id
         JOIN social_account a ON p.account_id = a.id
         WHERE c.space_id = ?1 AND p.timestamp >= ?2
         GROUP BY c.id
         ORDER BY post_count DESC
         LIMIT 10",
    )?;

    let stats = stmt.query_map([space_id, &cutoff.to_string()], |row| {
        Ok(CategoryStats {
            category_name: row.get(0)?,
            post_count: row.get(1)?,
            avg_likes: row.get(2)?,
        })
    })?;

    let mut result = Vec::new();
    for stat in stats {
        result.push(stat?);
    }

    Ok(result)
}

/// Get engagement stats
fn get_engagement_stats(
    conn: &Connection,
    space_id: &str,
    days: i64,
) -> Result<EngagementStats, SocialError> {
    let cutoff = chrono::Utc::now().timestamp_millis() - (days * 24 * 60 * 60 * 1000);

    let mut stmt = conn.prepare(
        "SELECT COUNT(*) as total_posts,
                COALESCE(SUM(p.likes), 0) as total_likes,
                COALESCE(SUM(p.comments), 0) as total_comments,
                COALESCE(SUM(p.shares), 0) as total_shares,
                COALESCE(SUM(p.views), 0) as total_views
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1 AND p.timestamp >= ?2",
    )?;

    let result = stmt.query_row([space_id, &cutoff.to_string()], |row| {
        let total_posts: i64 = row.get(0)?;
        let total_likes: i64 = row.get(1)?;
        let total_comments: i64 = row.get(2)?;
        let total_shares: i64 = row.get(3)?;
        let total_views: i64 = row.get(4)?;

        let avg_engagement_rate = if total_posts > 0 && total_views > 0 {
            ((total_likes + total_comments + total_shares) as f64 / total_views as f64) * 100.0
        } else {
            0.0
        };

        Ok(EngagementStats {
            total_posts,
            total_likes,
            total_comments,
            total_shares,
            total_views,
            avg_engagement_rate,
        })
    })?;

    Ok(result)
}

/// Get top performing posts
fn get_top_posts(
    conn: &Connection,
    space_id: &str,
    days: i64,
) -> Result<Vec<TopPost>, SocialError> {
    let cutoff = chrono::Utc::now().timestamp_millis() - (days * 24 * 60 * 60 * 1000);

    let mut stmt = conn.prepare(
        "SELECT p.id, p.platform, p.author, p.content, p.timestamp,
                (COALESCE(p.likes, 0) + COALESCE(p.comments, 0) * 2 + COALESCE(p.shares, 0) * 3) as engagement_score
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1 AND p.timestamp >= ?2
         ORDER BY engagement_score DESC
         LIMIT 10",
    )?;

    let posts = stmt.query_map([space_id, &cutoff.to_string()], |row| {
        let content: Option<String> = row.get(3)?;
        let truncated_content = content
            .unwrap_or_default()
            .chars()
            .take(100)
            .collect::<String>();

        Ok(TopPost {
            id: row.get(0)?,
            platform: row.get(1)?,
            author: row.get(2)?,
            content: truncated_content,
            timestamp: row.get(4)?,
            engagement_score: row.get(5)?,
        })
    })?;

    let mut result = Vec::new();
    for post in posts {
        result.push(post?);
    }

    Ok(result)
}
