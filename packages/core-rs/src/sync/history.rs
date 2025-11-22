use rusqlite::Connection;
use crate::sync::error::SyncError;
use crate::sync::models::{SyncHistoryEntry, SyncStats};
use ulid::Ulid;
use rusqlite::OptionalExtension;

pub struct SyncHistory;

impl SyncHistory {
    /// Record sync history
    pub fn record(
        conn: &Connection,
        device_id: &str,
        space_id: &str,
        direction: &str,
        entities_pushed: u32,
        entities_pulled: u32,
        conflicts: u32,
        success: bool,
        error_message: Option<&str>,
    ) -> Result<String, SyncError> {
        let id = Ulid::new().to_string();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        conn.execute(
            "INSERT INTO sync_history (id, device_id, space_id, sync_time, direction,
                                       entities_pushed, entities_pulled, conflicts_detected,
                                       success, error_message)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                id,
                device_id,
                space_id,
                now,
                direction,
                entities_pushed as i32,
                entities_pulled as i32,
                conflicts as i32,
                if success { 1 } else { 0 },
                error_message,
            ],
        )?;

        Ok(id)
    }

    /// Get sync history for a space
    pub fn get_for_space(
        conn: &Connection,
        space_id: &str,
        limit: u32,
    ) -> Result<Vec<SyncHistoryEntry>, SyncError> {
        let mut stmt = conn.prepare(
            "SELECT id, device_id, space_id, sync_time, direction, entities_pushed,
                    entities_pulled, conflicts_detected, success, error_message
             FROM sync_history
             WHERE space_id = ?1
             ORDER BY sync_time DESC
             LIMIT ?2",
        )?;

        let entries = stmt
            .query_map(rusqlite::params![space_id, limit], |row| {
                Ok(SyncHistoryEntry {
                    id: row.get(0)?,
                    device_id: row.get(1)?,
                    space_id: row.get(2)?,
                    sync_time: row.get(3)?,
                    direction: row.get(4)?,
                    entities_pushed: row.get(5)?,
                    entities_pulled: row.get(6)?,
                    conflicts_detected: row.get(7)?,
                    success: row.get::<_, i32>(8)? == 1,
                    error_message: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(entries)
    }

    /// Get sync statistics for a space
    pub fn get_stats(conn: &Connection, space_id: &str) -> Result<SyncStats, SyncError> {
        let mut stmt = conn.prepare(
            "SELECT
                COUNT(*) as total_syncs,
                MAX(sync_time) as last_sync,
                SUM(success) as success_count,
                SUM(conflicts_detected) as conflicts_total,
                SUM(entities_pushed + entities_pulled) as total_entities
             FROM sync_history
             WHERE space_id = ?1"
        )?;

        let stats = stmt.query_row([space_id], |row| {
            let total_syncs: i32 = row.get(0).unwrap_or(0);
            let last_sync_at: Option<i64> = row.get(1).ok();
            let success_count: i32 = row.get(2).unwrap_or(0);
            let conflicts_total: i32 = row.get(3).unwrap_or(0);
            let total_entities: i32 = row.get(4).unwrap_or(0);

            let success_rate = if total_syncs > 0 {
                success_count as f64 / total_syncs as f64
            } else {
                0.0
            };

            Ok(SyncStats {
                total_synced: total_entities,
                last_sync_at,
                success_rate,
                conflicts_total,
            })
        })?;

        Ok(stats)
    }

    pub fn get_last_sync_time(conn: &Connection, space_id: &str) -> Result<i64, SyncError> {
        let result: Option<i64> = conn
            .query_row(
                "SELECT MAX(sync_time) FROM sync_history WHERE space_id = ?1 AND success = 1",
                [space_id],
                |row| row.get(0),
            )
            .optional()?;

        Ok(result.unwrap_or(0))
    }
}
