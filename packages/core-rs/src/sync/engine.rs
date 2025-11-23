use crate::sync::conflict::{ConflictResolution, ConflictType};
use crate::sync::delta_applier::DeltaApplier;
use crate::sync::delta_gatherer::DeltaGatherer;
use crate::sync::error::SyncError;
use crate::sync::history::SyncHistory;
use crate::sync::models::*;
use rusqlite::{Connection, OptionalExtension};
use std::collections::HashMap;
use ulid::Ulid;

/// Sync agent handles device discovery and synchronization
pub struct SyncAgent {
    device_id: String,
    device_name: String,
    sync_port: u16,
}

impl SyncAgent {
    /// Create a new sync agent
    pub fn new(device_id: String, device_name: String, sync_port: u16) -> Self {
        SyncAgent {
            device_id,
            device_name,
            sync_port,
        }
    }

    /// Get this device's info
    pub fn get_device_info(&self) -> DeviceInfo {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        DeviceInfo {
            device_id: self.device_id.clone(),
            device_name: self.device_name.clone(),
            device_type: DeviceType::Desktop,
            last_seen: now,
            sync_address: "localhost".to_string(),
            sync_port: self.sync_port,
            protocol_version: "1.0.0".to_string(),
        }
    }

    /// Register a discovered device
    pub fn register_device(
        &self,
        conn: &Connection,
        device_info: &DeviceInfo,
    ) -> Result<(), SyncError> {
        conn.execute(
            "INSERT OR REPLACE INTO sync_state (
                device_id, device_name, device_type, last_seen,
                sync_address, sync_port, protocol_version, trusted
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                &device_info.device_id,
                &device_info.device_name,
                serde_json::to_string(&device_info.device_type)
                    .map_err(|e| SyncError::InvalidData(e.to_string()))?,
                device_info.last_seen,
                &device_info.sync_address,
                device_info.sync_port,
                &device_info.protocol_version,
                false, // Not trusted by default
            ],
        )?;

        Ok(())
    }

    /// Get all registered devices
    pub fn get_devices(&self, conn: &Connection) -> Result<Vec<DeviceInfo>, SyncError> {
        let mut stmt = conn.prepare(
            "SELECT device_id, device_name, device_type, last_seen,
                    sync_address, sync_port, protocol_version
             FROM sync_state
             ORDER BY last_seen DESC",
        )?;

        let devices = stmt
            .query_map([], |row| {
                let device_type_str: String = row.get(2)?;
                let device_type: DeviceType =
                    serde_json::from_str(&device_type_str).unwrap_or(DeviceType::Desktop);

                Ok(DeviceInfo {
                    device_id: row.get(0)?,
                    device_name: row.get(1)?,
                    device_type,
                    last_seen: row.get(3)?,
                    sync_address: row.get(4)?,
                    sync_port: row.get(5)?,
                    protocol_version: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(devices)
    }

    /// Create a sync manifest for a space
    pub fn create_manifest(
        &self,
        conn: &Connection,
        space_id: Ulid,
    ) -> Result<SyncManifest, SyncError> {
        let last_sync_at = SyncHistory::get_last_sync_time(conn, &space_id.to_string())?;
        let vector_clock = self.get_vector_clock(conn, space_id)?;
        let entity_hashes = self.compute_entity_hashes(conn, space_id)?;

        Ok(SyncManifest {
            device_id: self.device_id.clone(),
            space_id,
            last_sync_at,
            vector_clock,
            entity_hashes,
        })
    }

    /// Get deltas since last sync
    pub fn get_deltas_since(
        &self,
        conn: &Connection,
        space_id: Ulid,
        since_timestamp: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        DeltaGatherer::get_deltas_since(conn, space_id, since_timestamp)
    }

    /// Apply incoming deltas
    pub fn apply_deltas(
        &self,
        conn: &mut Connection,
        deltas: Vec<SyncDelta>,
        dek: &[u8],
    ) -> Result<Vec<SyncConflict>, SyncError> {
        let mut conflicts = Vec::new();
        let tx = conn.transaction()?;

        for delta in deltas {
            if let Some(conflict) = self.detect_conflict(&tx, &delta)? {
                let conflict_id = Ulid::new().to_string();
                if let Some(space_id) = &conflict.space_id {
                    tx.execute(
                        "INSERT INTO sync_conflict (
                            id, entity_type, entity_id, local_version, remote_version,
                            conflict_type, detected_at, resolved, device_id, space_id
                        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8, ?9)",
                        rusqlite::params![
                            conflict_id,
                            conflict.entity_type,
                            conflict.entity_id,
                            conflict.local_version,
                            conflict.remote_version,
                            format!("{:?}", conflict.conflict_type),
                            chrono::Utc::now().timestamp(),
                            self.device_id,
                            space_id
                        ],
                    )?;
                    conflicts.push(conflict);
                } else {
                    log::error!(
                        "Cannot persist conflict for {} without space_id",
                        delta.entity_id
                    );
                }
                continue;
            }

            match DeltaApplier::apply_single_delta(&tx, &delta, dek) {
                Ok(_) => {
                    self.log_entity_sync(&tx, &delta)?;
                }
                Err(SyncError::ConflictError(_)) => {
                    // Handled by detect_conflict or logic inside
                }
                Err(e) => return Err(e),
            }
        }

        tx.commit()?;
        Ok(conflicts)
    }

    /// Get unresolved conflicts
    pub fn get_unresolved_conflicts(
        &self,
        conn: &Connection,
    ) -> Result<Vec<SyncConflict>, SyncError> {
        let mut stmt = conn.prepare(
            "SELECT entity_type, entity_id, local_version, remote_version, conflict_type, space_id
             FROM sync_conflict
             WHERE resolved = 0",
        )?;

        let conflicts = stmt
            .query_map([], |row| {
                let conflict_type_str: String = row.get(4)?;
                let conflict_type: ConflictType = match conflict_type_str.as_str() {
                    "UpdateUpdate" => ConflictType::UpdateUpdate,
                    "DeleteUpdate" => ConflictType::DeleteUpdate,
                    "UpdateDelete" => ConflictType::UpdateDelete,
                    _ => ConflictType::UpdateUpdate,
                };

                Ok(SyncConflict {
                    entity_type: row.get(0)?,
                    entity_id: row.get(1)?,
                    local_version: row.get(2)?,
                    remote_version: row.get(3)?,
                    conflict_type,
                    space_id: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(conflicts)
    }

    /// Record sync history
    #[allow(clippy::too_many_arguments)]
    pub fn record_sync_history(
        &self,
        conn: &Connection,
        space_id: &str,
        direction: &str,
        items_synced: i64,
        items_failed: i64,
        _duration_ms: i64,
        success: bool,
        details: Option<&str>,
    ) -> Result<(), SyncError> {
        let id = Ulid::new().to_string();
        let now = chrono::Utc::now().timestamp();

        let (pushed, pulled) = if direction == "push" {
            (items_synced, 0)
        } else {
            (0, items_synced)
        };

        conn.execute(
            "INSERT INTO sync_history (
                id, space_id, device_id, sync_time, direction,
                entities_pushed, entities_pulled, conflicts_detected, success, error_message
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                id,
                space_id,
                self.device_id,
                now,
                direction,
                pushed,
                pulled,
                items_failed,
                success,
                details
            ],
        )?;
        Ok(())
    }

    /// Get sync history
    pub fn get_sync_history(
        &self,
        conn: &Connection,
        space_id: &str,
        limit: i64,
    ) -> Result<Vec<SyncHistoryEntry>, SyncError> {
        let mut stmt = conn.prepare(
            "SELECT id, device_id, sync_time, direction, entities_pushed, entities_pulled, conflicts_detected, success, error_message
             FROM sync_history
             WHERE space_id = ?1
             ORDER BY sync_time DESC
             LIMIT ?2"
        )?;

        let history = stmt
            .query_map(rusqlite::params![space_id, limit], |row| {
                Ok(SyncHistoryEntry {
                    id: row.get(0)?,
                    space_id: space_id.to_string(),
                    device_id: row.get(1)?,
                    sync_time: row.get(2)?,
                    direction: row.get(3)?,
                    entities_pushed: row.get::<_, i64>(4).unwrap_or(0) as i32,
                    entities_pulled: row.get::<_, i64>(5).unwrap_or(0) as i32,
                    conflicts_detected: row.get::<_, i64>(6).unwrap_or(0) as i32,
                    success: row.get(7)?,
                    error_message: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(history)
    }

    /// Get all active sync tasks (placeholder implementation for now)
    pub fn get_all_sync_tasks(
        &self,
        _conn: &Connection,
        _space_id: &str,
    ) -> Result<Vec<SyncTask>, SyncError> {
        Ok(vec![])
    }

    /// Get sync stats
    pub fn get_sync_stats(
        &self,
        conn: &Connection,
        space_id: &str,
    ) -> Result<SyncStats, SyncError> {
        let last_sync_at_row = conn
            .query_row(
                "SELECT MAX(sync_time) FROM sync_history WHERE space_id = ?1 AND success = 1",
                [space_id],
                |row| row.get::<_, Option<i64>>(0),
            )
            .optional()?;

        let last_sync_at = last_sync_at_row.flatten();

        let total_synced_row = conn
            .query_row(
                "SELECT SUM(entities_pushed + entities_pulled) FROM sync_history WHERE space_id = ?1",
                [space_id],
                |row| row.get::<_, Option<i64>>(0),
            )
            .optional()?;

        let total_synced = total_synced_row.flatten().unwrap_or(0);

        let conflicts_total: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sync_conflict WHERE space_id = ?1",
                [space_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let total_attempts: f64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sync_history WHERE space_id = ?1",
                [space_id],
                |row| row.get(0),
            )
            .unwrap_or(0.0);

        let successful_attempts: f64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sync_history WHERE space_id = ?1 AND success = 1",
                [space_id],
                |row| row.get(0),
            )
            .unwrap_or(0.0);

        let success_rate = if total_attempts > 0.0 {
            successful_attempts / total_attempts
        } else {
            1.0
        };

        Ok(SyncStats {
            last_sync_at,
            total_synced: total_synced as i32,
            conflicts_total: conflicts_total as i32,
            success_rate,
        })
    }

    /// Resolve a sync conflict
    pub fn resolve_conflict(
        &self,
        conn: &Connection,
        conflict: &SyncConflict,
        resolution: ConflictResolution,
        dek: &[u8],
    ) -> Result<(), SyncError> {
        match resolution {
            ConflictResolution::UseLocal => {
                self.mark_conflict_resolved(conn, &conflict.entity_id)?;
            }
            ConflictResolution::UseRemote => {
                let delta = SyncDelta {
                    entity_type: conflict.entity_type.clone(),
                    entity_id: conflict.entity_id.clone(),
                    operation: SyncOperation::Update,
                    data: Some(conflict.remote_version.clone()),
                    timestamp: chrono::Utc::now().timestamp(),
                    vector_clock: HashMap::new(),
                    space_id: conflict.space_id.clone(),
                };
                DeltaApplier::apply_single_delta(conn, &delta, dek)?;
                self.mark_conflict_resolved(conn, &conflict.entity_id)?;
            }
            ConflictResolution::Merge => {
                self.smart_merge_entity(conn, conflict, dek)?;
                self.mark_conflict_resolved(conn, &conflict.entity_id)?;
            }
        }

        Ok(())
    }

    /// Smart merge logic for supported entities
    fn smart_merge_entity(
        &self,
        conn: &Connection,
        conflict: &SyncConflict,
        dek: &[u8],
    ) -> Result<(), SyncError> {
        let local_bytes = &conflict.local_version;
        let remote_bytes = &conflict.remote_version;

        match conflict.entity_type.as_str() {
            "task" => {
                let local: serde_json::Value =
                    serde_json::from_slice(local_bytes).unwrap_or(serde_json::json!({}));
                let remote: serde_json::Value =
                    serde_json::from_slice(remote_bytes).unwrap_or(serde_json::json!({}));

                // Merge strategy for Task:
                let mut merged = local.clone();

                if let Some(r_status) = remote.get("status").and_then(|s| s.as_str()) {
                    if r_status == "done" || r_status == "cancelled" {
                        merged["status"] = remote["status"].clone();
                    }
                }

                if let Some(r_title) = remote.get("title").and_then(|s| s.as_str()) {
                    if let Some(l_title) = local.get("title").and_then(|s| s.as_str()) {
                        if r_title != l_title && r_title.len() > l_title.len() {
                            merged["title"] = remote["title"].clone();
                        }
                    } else {
                        merged["title"] = remote["title"].clone();
                    }
                }

                let delta = SyncDelta {
                    entity_type: "task".into(),
                    entity_id: conflict.entity_id.clone(),
                    operation: SyncOperation::Update,
                    data: Some(
                        serde_json::to_vec(&merged)
                            .map_err(|e| SyncError::InvalidData(e.to_string()))?,
                    ),
                    timestamp: chrono::Utc::now().timestamp(),
                    vector_clock: HashMap::new(),
                    space_id: conflict.space_id.clone(),
                };
                DeltaApplier::apply_single_delta(conn, &delta, dek)?;
            }
            "note" => {
                let local_str = String::from_utf8(local_bytes.clone()).unwrap_or_default();
                let remote_str = String::from_utf8(remote_bytes.clone()).unwrap_or_default();

                let merged_content = format!(
                    "{}\n\n--- MERGED REMOTE CONTENT ---\n\n{}",
                    local_str, remote_str
                );

                let delta = SyncDelta {
                    entity_type: "note".into(),
                    entity_id: conflict.entity_id.clone(),
                    operation: SyncOperation::Update,
                    data: Some(merged_content.into_bytes()),
                    timestamp: chrono::Utc::now().timestamp(),
                    vector_clock: HashMap::new(),
                    space_id: conflict.space_id.clone(),
                };
                DeltaApplier::apply_single_delta(conn, &delta, dek)?;
            }
            _ => {
                log::warn!(
                    "No smart merge for {}, defaulting to remote",
                    conflict.entity_type
                );
                let delta = SyncDelta {
                    entity_type: conflict.entity_type.clone(),
                    entity_id: conflict.entity_id.clone(),
                    operation: SyncOperation::Update,
                    data: Some(remote_bytes.clone()),
                    timestamp: chrono::Utc::now().timestamp(),
                    vector_clock: HashMap::new(),
                    space_id: conflict.space_id.clone(),
                };
                DeltaApplier::apply_single_delta(conn, &delta, dek)?;
            }
        }
        Ok(())
    }

    // --- Private Helpers ---

    fn get_vector_clock(
        &self,
        conn: &Connection,
        space_id: Ulid,
    ) -> Result<HashMap<String, i64>, SyncError> {
        let mut clock = HashMap::new();

        let mut stmt = conn.prepare(
            "SELECT device_id, MAX(sync_time)
             FROM sync_history
             WHERE space_id = ?1
             GROUP BY device_id",
        )?;

        let rows = stmt.query_map([space_id.to_string()], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<i64>>(1)?.unwrap_or(0),
            ))
        })?;

        for row in rows {
            let (device_id, timestamp) = row?;
            clock.insert(device_id, timestamp);
        }

        Ok(clock)
    }

    fn compute_entity_hashes(
        &self,
        conn: &Connection,
        space_id: Ulid,
    ) -> Result<HashMap<String, String>, SyncError> {
        let mut hashes = HashMap::new();
        let mut stmt = conn.prepare("SELECT id, modified_at FROM note WHERE space_id = ?1")?;
        let note_rows = stmt.query_map([space_id.to_string()], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })?;

        for row in note_rows {
            let (id, updated_at) = row?;
            hashes.insert(format!("note:{}", id), format!("{}", updated_at));
        }
        Ok(hashes)
    }

    fn detect_conflict(
        &self,
        conn: &Connection,
        delta: &SyncDelta,
    ) -> Result<Option<SyncConflict>, SyncError> {
        let (local_timestamp, local_data): (Option<i64>, Option<Vec<u8>>) =
            match delta.entity_type.as_str() {
                "note" => {
                    let ts = conn
                        .query_row(
                            "SELECT modified_at FROM note WHERE id = ?1",
                            [&delta.entity_id],
                            |row| row.get(0),
                        )
                        .optional()?;
                    let data = conn
                        .query_row(
                            "SELECT content_md FROM note WHERE id = ?1",
                            [&delta.entity_id],
                            |row| row.get::<_, String>(0).map(|s| s.into_bytes()),
                        )
                        .optional()?;
                    (ts, data)
                }
                "task" => {
                    let ts = conn
                        .query_row(
                            "SELECT updated_at FROM task WHERE id = ?1",
                            [&delta.entity_id],
                            |row| row.get(0),
                        )
                        .optional()?;
                    let task_row = conn
                        .query_row(
                            "SELECT title, status FROM task WHERE id = ?1",
                            [&delta.entity_id],
                            |row| {
                                Ok(serde_json::json!({
                                    "title": row.get::<_, String>(0)?,
                                    "status": row.get::<_, String>(1)?
                                })
                                .to_string()
                                .into_bytes())
                            },
                        )
                        .optional()?;
                    (ts, task_row)
                }
                "project" => {
                    let ts = conn
                        .query_row(
                            "SELECT updated_at FROM project WHERE id = ?1",
                            [&delta.entity_id],
                            |row| row.get(0),
                        )
                        .optional()?;
                    (ts, None)
                }
                _ => (None, None),
            };

        if let Some(local_ts) = local_timestamp {
            let space_id = delta
                .space_id
                .clone()
                .ok_or(SyncError::InvalidData("No space_id".into()))?;
            let last_sync = SyncHistory::get_last_sync_time(conn, &space_id)?;

            if local_ts > last_sync && delta.timestamp > last_sync {
                return Ok(Some(SyncConflict {
                    entity_type: delta.entity_type.clone(),
                    entity_id: delta.entity_id.clone(),
                    local_version: local_data.unwrap_or_default(),
                    remote_version: delta.data.clone().unwrap_or_default(),
                    conflict_type: ConflictType::UpdateUpdate,
                    space_id: delta.space_id.clone(),
                }));
            }
        }

        Ok(None)
    }

    fn log_entity_sync(&self, conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
        let log_id = Ulid::new().to_string();
        conn.execute(
            "INSERT INTO entity_sync_log (
                id, entity_type, entity_id, synced_at, device_id, operation
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                log_id,
                &delta.entity_type,
                &delta.entity_id,
                delta.timestamp,
                &self.device_id,
                serde_json::to_string(&delta.operation)
                    .map_err(|e| SyncError::InvalidData(e.to_string()))?
            ],
        )?;
        Ok(())
    }

    fn mark_conflict_resolved(&self, conn: &Connection, entity_id: &str) -> Result<(), SyncError> {
        conn.execute(
            "UPDATE sync_conflict SET resolved = 1, resolved_at = ?1 WHERE entity_id = ?2",
            rusqlite::params![chrono::Utc::now().timestamp(), entity_id],
        )?;
        Ok(())
    }
}
