//! Social Post Maintenance Module
//!
//! Handles archival, pruning, and optimization of social post data.
//! Designed to be called on startup and periodically to keep the database performant.

use rusqlite::{params, Connection, Result};
use std::time::{SystemTime, UNIX_EPOCH};

/// Default retention period in days for hot storage
pub const DEFAULT_RETENTION_DAYS: u64 = 7;

/// Maximum posts to archive in a single batch (to avoid long locks)
pub const BATCH_SIZE: usize = 1000;

/// Maintenance result with statistics
#[derive(Debug, Clone)]
pub struct MaintenanceResult {
    pub posts_archived: usize,
    pub posts_deleted: usize,
    pub duration_ms: u64,
}

/// Initialize maintenance - runs on app startup
/// Performs archival and cleanup of old social posts
pub fn run_startup_maintenance(
    conn: &mut Connection,
    retention_days: u64,
) -> Result<MaintenanceResult> {
    let start = std::time::Instant::now();

    log::info!(
        "[maintenance] Starting startup maintenance (retention: {} days)",
        retention_days
    );

    // Archive old posts
    let archived = prune_old_posts(conn, retention_days)?;

    // Clean up orphaned archives (posts archived more than 30 days ago)
    let deleted = cleanup_old_archives(conn, 30)?;

    let duration = start.elapsed().as_millis() as u64;

    let result = MaintenanceResult {
        posts_archived: archived,
        posts_deleted: deleted,
        duration_ms: duration,
    };

    log::info!(
        "[maintenance] Complete - Archived: {}, Deleted: {}, Duration: {}ms",
        result.posts_archived,
        result.posts_deleted,
        result.duration_ms
    );

    Ok(result)
}

/// Prune social posts older than the specified retention period.
/// Moves essential data to `social_post_archive` and deletes the original record.
pub fn prune_old_posts(conn: &mut Connection, retention_days: u64) -> Result<usize> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs() as i64;

    let retention_seconds = (retention_days * 24 * 60 * 60) as i64;
    let cutoff_timestamp = now - retention_seconds;

    log::info!(
        "[maintenance] Pruning posts older than timestamp {}",
        cutoff_timestamp
    );

    let tx = conn.transaction()?;

    // Count posts to be archived
    let count: i64 = tx.query_row(
        "SELECT COUNT(*) FROM social_post WHERE timestamp < ?",
        params![cutoff_timestamp],
        |row| row.get(0),
    )?;

    if count == 0 {
        log::info!("[maintenance] No posts to archive");
        tx.commit()?;
        return Ok(0);
    }

    // 1. Copy to Archive (without raw_json to save space)
    let rows_archived = tx.execute(
        "INSERT OR IGNORE INTO social_post_archive (id, account_id, platform, author, content, timestamp, archived_at)
         SELECT id, account_id, platform, author, content, timestamp, ?
         FROM social_post
         WHERE timestamp < ?
         LIMIT ?",
        params![now, cutoff_timestamp, BATCH_SIZE as i64],
    )?;

    // 2. Delete from Main Table (only archived ones)
    let rows_deleted = tx.execute(
        "DELETE FROM social_post 
         WHERE id IN (
             SELECT id FROM social_post_archive WHERE archived_at = ?
         )",
        params![now],
    )?;

    tx.commit()?;

    log::info!(
        "[maintenance] Archived {} posts, Deleted {} posts",
        rows_archived,
        rows_deleted
    );

    Ok(rows_deleted)
}

/// Clean up old archive entries that are beyond the archive retention period
pub fn cleanup_old_archives(conn: &mut Connection, archive_retention_days: u64) -> Result<usize> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs() as i64;

    let archive_cutoff = now - (archive_retention_days * 24 * 60 * 60) as i64;

    let deleted = conn.execute(
        "DELETE FROM social_post_archive WHERE archived_at < ?",
        params![archive_cutoff],
    )?;

    if deleted > 0 {
        log::info!("[maintenance] Cleaned up {} old archive entries", deleted);
    }

    Ok(deleted)
}

/// Optimize database after maintenance (VACUUM)
/// Only run occasionally as it's expensive
pub fn optimize_database(conn: &Connection) -> Result<()> {
    log::info!("[maintenance] Running database optimization");

    // Analyze for query optimization
    conn.execute("ANALYZE", [])?;

    // Note: VACUUM is very expensive and locks the database
    // Only run manually or during low-activity periods
    // conn.execute("VACUUM", [])?;

    Ok(())
}

/// Get maintenance statistics
pub fn get_maintenance_stats(conn: &Connection) -> Result<MaintenanceStats> {
    let hot_posts: i64 =
        conn.query_row("SELECT COUNT(*) FROM social_post", [], |row| row.get(0))?;

    let archived_posts: i64 =
        conn.query_row("SELECT COUNT(*) FROM social_post_archive", [], |row| {
            row.get(0)
        })?;

    let hot_size: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(LENGTH(raw_json)), 0) FROM social_post",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(MaintenanceStats {
        hot_posts: hot_posts as usize,
        archived_posts: archived_posts as usize,
        hot_storage_bytes: hot_size as usize,
    })
}

#[derive(Debug, Clone)]
pub struct MaintenanceStats {
    pub hot_posts: usize,
    pub archived_posts: usize,
    pub hot_storage_bytes: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();

        conn.execute(
            "CREATE TABLE social_post (
                id TEXT PRIMARY KEY,
                account_id TEXT,
                platform TEXT,
                author TEXT,
                content TEXT,
                timestamp INTEGER,
                raw_json TEXT
            )",
            [],
        )
        .unwrap();

        conn.execute(
            "CREATE TABLE social_post_archive (
                id TEXT PRIMARY KEY,
                account_id TEXT,
                platform TEXT,
                author TEXT,
                content TEXT,
                timestamp INTEGER,
                archived_at INTEGER
            )",
            [],
        )
        .unwrap();

        conn
    }

    #[test]
    fn test_prune_old_posts() {
        let mut conn = setup_test_db();

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        // Insert old post (10 days ago)
        conn.execute(
            "INSERT INTO social_post (id, account_id, platform, author, content, timestamp, raw_json) 
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            params!["old_post", "acc1", "twitter", "user1", "old content", now - 864000, "{}"],
        ).unwrap();

        // Insert recent post
        conn.execute(
            "INSERT INTO social_post (id, account_id, platform, author, content, timestamp, raw_json) 
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            params!["new_post", "acc1", "twitter", "user1", "new content", now - 3600, "{}"],
        ).unwrap();

        // Run pruning with 7 day retention
        let pruned = prune_old_posts(&mut conn, 7).unwrap();

        assert_eq!(pruned, 1);

        // Verify old post is archived
        let archived: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM social_post_archive WHERE id = 'old_post'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(archived, 1);

        // Verify new post is still in hot storage
        let hot: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM social_post WHERE id = 'new_post'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(hot, 1);
    }

    #[test]
    fn test_startup_maintenance() {
        let mut conn = setup_test_db();

        let result = run_startup_maintenance(&mut conn, 7).unwrap();

        assert_eq!(result.posts_archived, 0);
        assert_eq!(result.posts_deleted, 0);
    }
}
