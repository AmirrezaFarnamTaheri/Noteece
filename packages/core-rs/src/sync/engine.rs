use rusqlite::{Connection, OptionalExtension};
use crate::sync::error::SyncError;
use crate::sync::models::*;
use crate::sync::conflict::{ConflictType, ConflictResolution};
use crate::sync::history::SyncHistory;
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
        let mut deltas = Vec::new();

        deltas.extend(self.get_notes_deltas(conn, space_id, since_timestamp)?);
        deltas.extend(self.get_tasks_deltas(conn, space_id, since_timestamp)?);
        deltas.extend(self.get_projects_deltas(conn, space_id, since_timestamp)?);
        deltas.extend(self.get_health_metrics_deltas(conn, space_id, since_timestamp)?);
        deltas.extend(self.get_tracks_deltas(conn, space_id, since_timestamp)?);
        deltas.extend(self.get_playlists_deltas(conn, space_id, since_timestamp)?);
        deltas.extend(self.get_calendar_events_deltas(conn, space_id, since_timestamp)?);

        deltas.sort_by_key(|d| d.timestamp);

        Ok(deltas)
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

        // Get last successful sync time for this space generally to help with split-brain detection
        // Note: Ideally we should know WHICH device these deltas are coming from to check against THAT device's last sync.
        // But SyncDelta doesn't carry source_device_id in the struct (it should).
        // For now, we rely on local vs remote timestamp and the fact that we are processing a sync session.

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
                    log::error!("Cannot persist conflict for {} without space_id", delta.entity_id);
                }
                continue;
            }

            match self.apply_single_delta(&tx, &delta, dek) {
                Ok(_) => {
                    self.log_entity_sync(&tx, &delta)?;
                }
                Err(SyncError::ConflictError(_msg)) => {
                    // Handled by detect_conflict or logic inside
                }
                Err(e) => return Err(e),
            }
        }

        tx.commit()?;
        Ok(conflicts)
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
                self.apply_single_delta(conn, &delta, dek)?;
                self.mark_conflict_resolved(conn, &conflict.entity_id)?;
            }
            ConflictResolution::Merge => {
                // TODO: Implement smart merging logic per entity type
                // For now, default to UseLocal to be safe
                self.mark_conflict_resolved(conn, &conflict.entity_id)?;
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
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
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

    fn apply_single_delta(
        &self,
        conn: &Connection,
        delta: &SyncDelta,
        dek: &[u8],
    ) -> Result<(), SyncError> {
        match delta.entity_type.as_str() {
            "note" => self.apply_note_delta(conn, delta, dek),
            "task" => self.apply_task_delta(conn, delta),
            "project" => self.apply_project_delta(conn, delta),
            "health_metric" => self.apply_health_metric_delta(conn, delta),
            "track" => self.apply_track_delta(conn, delta),
            "playlist" => self.apply_playlist_delta(conn, delta),
            "calendar_event" => self.apply_calendar_event_delta(conn, delta),
            _ => Err(SyncError::InvalidData(format!(
                "Unknown entity type: {}",
                delta.entity_type
            ))),
        }
    }

    // Entity specific apply methods (same as before, copying logic)
    fn apply_note_delta(
        &self,
        conn: &Connection,
        delta: &SyncDelta,
        _dek: &[u8],
    ) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    let content = String::from_utf8(data.clone())
                        .map_err(|e| SyncError::InvalidData(e.to_string()))?;
                    let space_id = if let Some(sid) = &delta.space_id {
                        Some(sid.clone())
                    } else {
                        conn.query_row(
                            "SELECT space_id FROM note WHERE id = ?1",
                            [&delta.entity_id],
                            |row| row.get(0)
                        ).optional()?
                    };

                    if let Some(sid) = space_id {
                        conn.execute(
                            "INSERT OR REPLACE INTO note (id, space_id, content_md, modified_at, created_at)
                             VALUES (?1, ?2, ?3, ?4, COALESCE((SELECT created_at FROM note WHERE id = ?1), ?4))",
                            rusqlite::params![&delta.entity_id, sid, content, delta.timestamp],
                        )?;
                    }
                }
                SyncOperation::Delete => {
                    conn.execute("DELETE FROM note WHERE id = ?1", [&delta.entity_id])?;
                }
            }
        }
        Ok(())
    }

    fn apply_task_delta(&self, conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            let task_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;

            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                     let space_id = if let Some(sid) = &delta.space_id {
                        Some(sid.clone())
                    } else {
                        conn.query_row(
                            "SELECT space_id FROM task WHERE id = ?1",
                            [&delta.entity_id],
                            |row| row.get(0)
                        ).optional()?
                    };

                    if let Some(sid) = space_id {
                        conn.execute(
                            "INSERT OR REPLACE INTO task (id, space_id, title, status, updated_at, created_at)
                             VALUES (?1, ?2, ?3, ?4, ?5, COALESCE((SELECT created_at FROM task WHERE id = ?1), ?5))",
                            rusqlite::params![
                                &delta.entity_id,
                                sid,
                                task_data["title"].as_str().unwrap_or(""),
                                task_data["status"].as_str().unwrap_or("inbox"),
                                delta.timestamp
                            ],
                        )?;
                    }
                }
                SyncOperation::Delete => {
                    conn.execute("DELETE FROM task WHERE id = ?1", [&delta.entity_id])?;
                }
            }
        }
        Ok(())
    }

    fn apply_project_delta(&self, conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            let project_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;

            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    let space_id = if let Some(sid) = &delta.space_id {
                        Some(sid.clone())
                    } else {
                        conn.query_row(
                            "SELECT space_id FROM project WHERE id = ?1",
                            [&delta.entity_id],
                            |row| row.get(0)
                        ).optional()?
                    };

                    if let Some(sid) = space_id {
                        let updated = conn.execute(
                            "UPDATE project SET title = ?1, updated_at = ?2 WHERE id = ?3",
                             rusqlite::params![
                                project_data["name"].as_str().unwrap_or(""),
                                delta.timestamp,
                                &delta.entity_id
                            ],
                        )?;
                        if updated == 0 {
                            conn.execute(
                                "INSERT INTO project (id, space_id, title, status, updated_at) VALUES (?1, ?2, ?3, 'proposed', ?4)",
                                rusqlite::params![
                                    &delta.entity_id,
                                    sid,
                                    project_data["name"].as_str().unwrap_or(""),
                                    delta.timestamp
                                ]
                            )?;
                        }
                    }
                }
                SyncOperation::Delete => {
                    conn.execute("DELETE FROM project WHERE id = ?1", [&delta.entity_id])?;
                }
            }
        }
        Ok(())
    }

    fn apply_health_metric_delta(&self, conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
         if let Some(data) = &delta.data {
            let metric_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;

            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                     let space_id = delta.space_id.clone().ok_or(SyncError::InvalidData("Missing space_id".to_string()))?;
                    conn.execute(
                        "INSERT OR REPLACE INTO health_metric (id, metric_type, value, unit, notes, recorded_at, created_at, updated_at, space_id)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                        rusqlite::params![
                            &delta.entity_id,
                            metric_data["metric_type"].as_str().unwrap_or(""),
                            metric_data["value"].as_f64().unwrap_or(0.0),
                            metric_data["unit"].as_str(),
                            metric_data["notes"].as_str(),
                            metric_data["recorded_at"].as_i64().unwrap_or(0),
                            metric_data["created_at"].as_i64().unwrap_or(0),
                            delta.timestamp,
                            space_id
                        ],
                    )?;
                }
                SyncOperation::Delete => {
                    conn.execute("DELETE FROM health_metric WHERE id = ?1", [&delta.entity_id])?;
                }
            }
        }
        Ok(())
    }

    fn apply_track_delta(&self, conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            let track_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;
            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    let space_id = delta.space_id.clone().ok_or(SyncError::InvalidData("Missing space_id".to_string()))?;
                    conn.execute(
                        "INSERT OR REPLACE INTO track (id, title, artist, album, updated_at, space_id, added_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5)",
                        rusqlite::params![
                            &delta.entity_id,
                            track_data["title"].as_str().unwrap_or(""),
                            track_data["artist"].as_str(),
                            track_data["album"].as_str(),
                            delta.timestamp,
                            space_id
                        ],
                    )?;
                }
                SyncOperation::Delete => conn.execute("DELETE FROM track WHERE id = ?1", [&delta.entity_id]).map(|_| ())?,
            }
        }
        Ok(())
    }

    fn apply_playlist_delta(&self, conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            let playlist_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;
             match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    let space_id = delta.space_id.clone().ok_or(SyncError::InvalidData("Missing space_id".to_string()))?;
                    conn.execute(
                        "INSERT OR REPLACE INTO playlist (id, name, description, updated_at, space_id, created_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?4)",
                        rusqlite::params![
                            &delta.entity_id,
                            playlist_data["name"].as_str().unwrap_or(""),
                            playlist_data["description"].as_str(),
                            delta.timestamp,
                            space_id
                        ],
                    )?;
                }
                SyncOperation::Delete => conn.execute("DELETE FROM playlist WHERE id = ?1", [&delta.entity_id]).map(|_| ())?,
            }
        }
        Ok(())
    }

    fn apply_calendar_event_delta(&self, conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
         if let Some(data) = &delta.data {
            let event_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;
            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    let space_id = delta.space_id.clone().ok_or(SyncError::InvalidData("Missing space_id".to_string()))?;
                    conn.execute(
                        "INSERT OR REPLACE INTO calendar_event (id, title, description, start_time, end_time, updated_at, space_id, source, created_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'sync', ?6)",
                        rusqlite::params![
                            &delta.entity_id,
                            event_data["title"].as_str().unwrap_or(""),
                            event_data["description"].as_str(),
                            event_data["start_time"].as_i64().unwrap_or(0),
                            event_data["end_time"].as_i64(),
                            delta.timestamp,
                            space_id
                        ],
                    )?;
                }
                SyncOperation::Delete => conn.execute("DELETE FROM calendar_event WHERE id = ?1", [&delta.entity_id]).map(|_| ())?,
            }
        }
        Ok(())
    }

    fn detect_conflict(
        &self,
        conn: &Connection,
        delta: &SyncDelta,
    ) -> Result<Option<SyncConflict>, SyncError> {
        let (local_timestamp, local_data): (Option<i64>, Option<Vec<u8>>) = match delta.entity_type.as_str() {
            "note" => {
                let ts = conn.query_row("SELECT modified_at FROM note WHERE id = ?1", [&delta.entity_id], |row| row.get(0)).optional()?;
                let data = conn.query_row("SELECT content_md FROM note WHERE id = ?1", [&delta.entity_id], |row| row.get::<_, String>(0).map(|s| s.into_bytes())).optional()?;
                (ts, data)
            }
            "task" => {
                let ts = conn.query_row("SELECT updated_at FROM task WHERE id = ?1", [&delta.entity_id], |row| row.get(0)).optional()?;
                (ts, None)
            }
            "project" => {
                let ts = conn.query_row("SELECT updated_at FROM project WHERE id = ?1", [&delta.entity_id], |row| row.get(0)).optional()?;
                (ts, None)
            }
            // Add other entities...
            _ => (None, None),
        };

        // SPLIT-BRAIN DETECTION LOGIC (CRITICAL UPDATE)
        if let Some(local_ts) = local_timestamp {
             // 1. If local is NEWER than incoming -> Conflict (Remote is overwriting my new work with old work? No, remote is sending its state)
             //    If remote timestamp < local timestamp, it means remote is sending OLD data. We should ignore it?
             //    Or is it a conflict? If remote says "I updated at t=5" and I have t=10.
             //    It depends on when we last synced.
             //    If we last synced at t=0. Both are new.
             //    If we last synced at t=8. I updated at t=10. Remote is sending t=5 (which is old? why would it send t=5 if we synced at t=8?)
             //    The Delta usually comes from "get_deltas_since(last_sync)".
             //    So remote sends changes SINCE last sync.
             //    If remote sends a change from t=5, it means we probably haven't synced since t=4.
             //    So both are new relative to last sync.

             // Simple LWW: if local_ts > delta.timestamp -> Conflict (Protect local).
             //              if local_ts < delta.timestamp -> Apply (Accept remote).

             // But what if BOTH changed?
             // Example: Last Sync t=0.
             // Device A (Local): Change at t=10.
             // Device B (Remote): Change at t=11.
             // B sends t=11.
             // Local check: local_ts (10) < delta.timestamp (11).
             // Result: Apply B. Overwrite A.
             // DATA LOSS: A's change at t=10 is gone.

             // FIX: We need to know if local changed SINCE last sync.
             // If local_ts > last_successful_sync_time AND delta.timestamp > last_successful_sync_time
             // THEN it is a true conflict, regardless of who is newer.

             let space_id = delta.space_id.clone().ok_or(SyncError::InvalidData("No space_id".into()))?;
             let last_sync = SyncHistory::get_last_sync_time(conn, &space_id)?;

             if local_ts > last_sync && delta.timestamp > last_sync {
                 // TRUE CONFLICT: Both changed independently since last sync.
                 return Ok(Some(SyncConflict {
                    entity_type: delta.entity_type.clone(),
                    entity_id: delta.entity_id.clone(),
                    local_version: local_data.unwrap_or_default(),
                    remote_version: delta.data.clone().unwrap_or_default(),
                    conflict_type: ConflictType::UpdateUpdate,
                    space_id: delta.space_id.clone(),
                }));
             }

             // Fallback to LWW protection for standard cases (e.g. clock skew protection)
             if local_ts > delta.timestamp {
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

    // Getters for Deltas (Same implementations as in original file, just ensuring they exist)
    fn get_notes_deltas(&self, conn: &Connection, space_id: Ulid, since: i64) -> Result<Vec<SyncDelta>, SyncError> {
         let mut stmt = conn.prepare("SELECT id, content_md, modified_at FROM note WHERE space_id = ?1 AND modified_at > ?2")?;
         let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, i64>(2)?))
         })?;
         let mut deltas = Vec::new();
         for row in rows {
             let (id, content, ts) = row?;
             deltas.push(SyncDelta {
                 entity_type: "note".into(), entity_id: id, operation: SyncOperation::Update,
                 data: Some(content.into_bytes()), timestamp: ts, vector_clock: HashMap::new(), space_id: Some(space_id.to_string())
             });
         }
         Ok(deltas)
    }

    // ... (Other getters follow similar pattern, omitting for brevity in this block but included in final compilation)
    // Actually, I must include them to make the file complete.
    fn get_tasks_deltas(&self, conn: &Connection, space_id: Ulid, since: i64) -> Result<Vec<SyncDelta>, SyncError> {
        let mut stmt = conn.prepare("SELECT id, title, status, updated_at FROM task WHERE space_id = ?1 AND updated_at > ?2")?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
             Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, i64>(3)?))
        })?;
        let mut deltas = Vec::new();
        for row in rows {
            let (id, title, status, ts) = row?;
            let data = serde_json::json!({ "title": title, "status": status }).to_string();
            deltas.push(SyncDelta {
                entity_type: "task".into(), entity_id: id, operation: SyncOperation::Update,
                data: Some(data.into_bytes()), timestamp: ts, vector_clock: HashMap::new(), space_id: Some(space_id.to_string())
            });
        }
        Ok(deltas)
    }

    fn get_projects_deltas(&self, conn: &Connection, space_id: Ulid, since: i64) -> Result<Vec<SyncDelta>, SyncError> {
        let mut stmt = conn.prepare("SELECT id, title, updated_at FROM project WHERE space_id = ?1 AND updated_at > ?2")?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
             Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, i64>(2)?))
        })?;
        let mut deltas = Vec::new();
        for row in rows {
            let (id, title, ts) = row?;
            let data = serde_json::json!({ "name": title }).to_string();
            deltas.push(SyncDelta {
                entity_type: "project".into(), entity_id: id, operation: SyncOperation::Update,
                data: Some(data.into_bytes()), timestamp: ts, vector_clock: HashMap::new(), space_id: Some(space_id.to_string())
            });
        }
        Ok(deltas)
    }

     fn get_health_metrics_deltas(&self, conn: &Connection, space_id: Ulid, since: i64) -> Result<Vec<SyncDelta>, SyncError> {
         let mut stmt = conn.prepare("SELECT id, metric_type, value, unit, notes, recorded_at, created_at, updated_at FROM health_metric WHERE space_id = ?1 AND updated_at > ?2")?;
         let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
             Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?, row.get(6)?, row.get(7)?))
         })?;
         let mut deltas = Vec::new();
         for row in rows {
             let (id, metric_type, value, unit, notes, recorded_at, created_at, updated_at): (String, String, f64, Option<String>, Option<String>, i64, i64, i64) = row?;
             let data = serde_json::json!({ "metric_type": metric_type, "value": value, "unit": unit, "notes": notes, "recorded_at": recorded_at, "created_at": created_at }).to_string();
             deltas.push(SyncDelta {
                 entity_type: "health_metric".into(), entity_id: id, operation: SyncOperation::Update,
                 data: Some(data.into_bytes()), timestamp: updated_at, vector_clock: HashMap::new(), space_id: Some(space_id.to_string())
             });
         }
         Ok(deltas)
    }

    fn get_tracks_deltas(&self, conn: &Connection, space_id: Ulid, since: i64) -> Result<Vec<SyncDelta>, SyncError> {
        let mut stmt = conn.prepare("SELECT id, title, artist, album, updated_at FROM track WHERE space_id = ?1 AND updated_at > ?2")?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
        })?;
        let mut deltas = Vec::new();
        for row in rows {
            let (id, title, artist, album, updated_at): (String, String, Option<String>, Option<String>, i64) = row?;
            let data = serde_json::json!({ "title": title, "artist": artist, "album": album }).to_string();
            deltas.push(SyncDelta {
                 entity_type: "track".into(), entity_id: id, operation: SyncOperation::Update,
                 data: Some(data.into_bytes()), timestamp: updated_at, vector_clock: HashMap::new(), space_id: Some(space_id.to_string())
             });
        }
        Ok(deltas)
    }

    fn get_playlists_deltas(&self, conn: &Connection, space_id: Ulid, since: i64) -> Result<Vec<SyncDelta>, SyncError> {
         let mut stmt = conn.prepare("SELECT id, name, description, updated_at FROM playlist WHERE space_id = ?1 AND updated_at > ?2")?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?;
        let mut deltas = Vec::new();
        for row in rows {
            let (id, name, description, updated_at): (String, String, Option<String>, i64) = row?;
            let data = serde_json::json!({ "name": name, "description": description }).to_string();
            deltas.push(SyncDelta {
                 entity_type: "playlist".into(), entity_id: id, operation: SyncOperation::Update,
                 data: Some(data.into_bytes()), timestamp: updated_at, vector_clock: HashMap::new(), space_id: Some(space_id.to_string())
             });
        }
        Ok(deltas)
    }

    fn get_calendar_events_deltas(&self, conn: &Connection, space_id: Ulid, since: i64) -> Result<Vec<SyncDelta>, SyncError> {
        let mut stmt = conn.prepare("SELECT id, title, description, start_time, end_time, updated_at FROM calendar_event WHERE space_id = ?1 AND updated_at > ?2")?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?))
        })?;
        let mut deltas = Vec::new();
        for row in rows {
            let (id, title, description, start_time, end_time, updated_at): (String, String, Option<String>, i64, Option<i64>, i64) = row?;
            let data = serde_json::json!({ "title": title, "description": description, "start_time": start_time, "end_time": end_time }).to_string();
            deltas.push(SyncDelta {
                 entity_type: "calendar_event".into(), entity_id: id, operation: SyncOperation::Update,
                 data: Some(data.into_bytes()), timestamp: updated_at, vector_clock: HashMap::new(), space_id: Some(space_id.to_string())
             });
        }
        Ok(deltas)
    }
}
