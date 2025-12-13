use crate::sync::error::SyncError;
use crate::sync::models::{SyncHistoryEntry, SyncStats};
use rusqlite::Connection;
use rusqlite::OptionalExtension;
use ulid::Ulid;

pub struct SyncHistory;

pub struct SyncRecordParams<'a> {
    pub device_id: &'a str,
    pub space_id: &'a str,
    pub direction: &'a str,
    pub entities_pushed: u32,
    pub entities_pulled: u32,
    pub conflicts: u32,
    pub success: bool,
    pub error_message: Option<&'a str>,
}

impl SyncHistory {
    /// Record sync history
    pub fn record(conn: &Connection, params: SyncRecordParams) -> Result<String, SyncError> {
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
                params.device_id,
                params.space_id,
                now,
                params.direction,
                params.entities_pushed as i32,
                params.entities_pulled as i32,
                params.conflicts as i32,
                if params.success { 1 } else { 0 },
                params.error_message,
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
             WHERE space_id = ?1",
        )?;

        let stats = stmt.query_row([space_id], |row| {
            let total_syncs: i32 = row.get(0)?;
            let last_sync_at: Option<i64> = row.get(1)?;
            let success_count: i32 = row.get(2).unwrap_or_default();
            let conflicts_total: i32 = row.get(3).unwrap_or_default();
            let total_entities: i32 = row.get(4).unwrap_or_default();

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

    /// Alternative: Return default stats on query error for graceful degradation
    pub fn get_stats_or_default(conn: &Connection, space_id: &str) -> SyncStats {
        Self::get_stats(conn, space_id).unwrap_or_default()
    }

    pub fn get_last_sync_time(conn: &Connection, space_id: &str) -> Result<i64, SyncError> {
        let result: Option<i64> = conn
            .query_row(
                "SELECT MAX(sync_time) FROM sync_history WHERE space_id = ?1 AND success = 1",
                [space_id],
                |row| Ok(row.get::<_, Option<i64>>(0).unwrap_or(None)),
            )
            .optional()?
            .flatten();

        Ok(result.unwrap_or(0))
    }
}
