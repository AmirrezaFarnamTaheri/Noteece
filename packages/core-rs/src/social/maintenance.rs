use rusqlite::{params, Connection, Result};
use std::time::{SystemTime, UNIX_EPOCH};

/// Prune social posts older than the specified retention period (e.g., 7 days).
/// Moves essential data to `social_post_archive` and deletes the original record (including `raw_json`).
pub fn prune_old_posts(conn: &mut Connection, retention_days: u64) -> Result<usize> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let retention_seconds = (retention_days * 24 * 60 * 60) as i64;
    let cutoff_timestamp = now - retention_seconds;

    log::info!("[maintenance] Pruning posts older than timestamp {}", cutoff_timestamp);

    let tx = conn.transaction()?;

    // 1. Copy to Archive
    let rows_archived = tx.execute(
        "INSERT OR IGNORE INTO social_post_archive (id, account_id, platform, author, content, timestamp, archived_at)
         SELECT id, account_id, platform, author, content, timestamp, ?
         FROM social_post
         WHERE timestamp < ?",
        params![now, cutoff_timestamp],
    )?;

    // 2. Delete from Main Table
    let rows_deleted = tx.execute(
        "DELETE FROM social_post WHERE timestamp < ?",
        params![cutoff_timestamp],
    )?;

    tx.commit()?;

    log::info!("[maintenance] Archived {} posts, Deleted {} posts", rows_archived, rows_deleted);

    // Vacuuming is expensive, so we might not want to do it every time, but for mobile it helps keep file size down.
    // For now, we skip explicit vacuum to avoid locking the DB for too long.

    Ok(rows_deleted)
}
