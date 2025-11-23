use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DashboardError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub health: HealthStats,
    pub music: MusicStats,
    pub social: SocialStats,
    pub tasks: TaskStats,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthStats {
    pub metrics_count: i64,
    pub latest_metric: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MusicStats {
    pub track_count: i64,
    pub playlist_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SocialStats {
    pub posts_count: i64,
    pub platforms_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskStats {
    pub pending_count: i64,
    pub completed_count: i64,
}

pub fn get_dashboard_stats(
    conn: &Connection,
    space_id: &str,
) -> Result<DashboardStats, DashboardError> {
    // Health Stats
    let metrics_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM health_metric WHERE space_id = ?1",
            [space_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let latest_metric: Option<String> = conn.query_row(
        "SELECT metric_type FROM health_metric WHERE space_id = ?1 ORDER BY recorded_at DESC LIMIT 1",
        [space_id],
        |row| row.get(0),
    ).ok();

    // Music Stats
    let track_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM track WHERE space_id = ?1",
            [space_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let playlist_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM playlist WHERE space_id = ?1",
            [space_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Social Stats
    let posts_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1",
            [space_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let platforms_count: i64 = conn
        .query_row(
            "SELECT COUNT(DISTINCT platform) FROM social_account WHERE space_id = ?1",
            [space_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Task Stats
    let pending_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM task WHERE space_id = ?1 AND status IN ('inbox', 'next', 'in_progress', 'waiting')",
        [space_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let completed_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM task WHERE space_id = ?1 AND status = 'done'",
            [space_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(DashboardStats {
        health: HealthStats {
            metrics_count,
            latest_metric,
        },
        music: MusicStats {
            track_count,
            playlist_count,
        },
        social: SocialStats {
            posts_count,
            platforms_count,
        },
        tasks: TaskStats {
            pending_count,
            completed_count,
        },
    })
}
