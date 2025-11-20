use rusqlite::{Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ulid::Ulid;

/// Initialize sync database tables
pub fn init_sync_tables(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Device tracking table (device registry for discovery)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_state (
            device_id TEXT PRIMARY KEY,
            device_name TEXT NOT NULL,
            device_type TEXT NOT NULL,
            last_seen INTEGER NOT NULL,
            sync_address TEXT NOT NULL,
            sync_port INTEGER NOT NULL,
            protocol_version TEXT NOT NULL,
            trusted INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )",
        [],
    )?;

    // Sync history table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_history (
            id TEXT PRIMARY KEY,
            device_id TEXT NOT NULL,
            space_id TEXT NOT NULL,
            sync_time INTEGER NOT NULL,
            direction TEXT NOT NULL,
            entities_pushed INTEGER NOT NULL DEFAULT 0,
            entities_pulled INTEGER NOT NULL DEFAULT 0,
            conflicts_detected INTEGER NOT NULL DEFAULT 0,
            success INTEGER NOT NULL DEFAULT 1,
            error_message TEXT,
            FOREIGN KEY (device_id) REFERENCES sync_state(device_id)
        )",
        [],
    )?;

    // Sync conflicts table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_conflict (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            local_version BLOB,
            remote_version BLOB,
            conflict_type TEXT NOT NULL,
            detected_at INTEGER NOT NULL,
            resolved INTEGER NOT NULL DEFAULT 0,
            resolved_at INTEGER,
            resolution TEXT,
            device_id TEXT NOT NULL,
            FOREIGN KEY (device_id) REFERENCES sync_state(device_id)
        )",
        [],
    )?;

    // Vector clock table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_vector_clock (
            space_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            clock_value INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (space_id, device_id)
        )",
        [],
    )?;

    // Entity sync log table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS entity_sync_log (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            synced_at INTEGER NOT NULL,
            device_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )",
        [],
    )?;

    Ok(())
}

/// Sync agent handles device discovery and synchronization
pub struct SyncAgent {
    device_id: String,
    device_name: String,
    sync_port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub device_id: String,
    pub device_name: String,
    pub device_type: DeviceType,
    pub last_seen: i64,
    pub sync_address: String,
    pub sync_port: u16,
    pub protocol_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DeviceType {
    Desktop,
    Mobile,
    Web,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncManifest {
    pub device_id: String,
    pub space_id: Ulid,
    pub last_sync_at: i64,
    pub vector_clock: HashMap<String, i64>,
    pub entity_hashes: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncDelta {
    pub entity_type: String,
    pub entity_id: String,
    pub operation: SyncOperation,
    pub data: Option<Vec<u8>>,
    pub timestamp: i64,
    pub vector_clock: HashMap<String, i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SyncOperation {
    Create,
    Update,
    Delete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncRequest {
    pub device_id: String,
    pub space_id: Ulid,
    pub since_timestamp: i64,
    pub vector_clock: HashMap<String, i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResponse {
    pub deltas: Vec<SyncDelta>,
    pub conflicts: Vec<SyncConflict>,
    pub new_vector_clock: HashMap<String, i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConflict {
    pub entity_type: String,
    pub entity_id: String,
    pub local_version: Vec<u8>,
    pub remote_version: Vec<u8>,
    pub conflict_type: ConflictType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ConflictType {
    UpdateUpdate,
    UpdateDelete,
    DeleteUpdate,
}

#[derive(Debug)]
pub enum SyncError {
    DatabaseError(String),
    NetworkError(String),
    EncryptionError(String),
    ConflictError(String),
    InvalidData(String),
}

impl std::fmt::Display for SyncError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SyncError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            SyncError::NetworkError(msg) => write!(f, "Network error: {}", msg),
            SyncError::EncryptionError(msg) => write!(f, "Encryption error: {}", msg),
            SyncError::ConflictError(msg) => write!(f, "Conflict error: {}", msg),
            SyncError::InvalidData(msg) => write!(f, "Invalid data: {}", msg),
        }
    }
}

impl std::error::Error for SyncError {}

impl From<rusqlite::Error> for SyncError {
    fn from(err: rusqlite::Error) -> Self {
        SyncError::DatabaseError(err.to_string())
    }
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
            .unwrap_or_default() // Fallback to 0 if time goes backwards
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
        let last_sync_at = self.get_last_sync_time(conn, space_id)?;
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

        // Get notes deltas
        deltas.extend(self.get_notes_deltas(conn, space_id, since_timestamp)?);

        // Get tasks deltas
        deltas.extend(self.get_tasks_deltas(conn, space_id, since_timestamp)?);

        // Get projects deltas
        deltas.extend(self.get_projects_deltas(conn, space_id, since_timestamp)?);

        // Get health metrics deltas
        deltas.extend(self.get_health_metrics_deltas(conn, space_id, since_timestamp)?);

        // Get tracks deltas
        deltas.extend(self.get_tracks_deltas(conn, space_id, since_timestamp)?);

        // Get playlists deltas
        deltas.extend(self.get_playlists_deltas(conn, space_id, since_timestamp)?);

        // Get calendar events deltas
        deltas.extend(self.get_calendar_events_deltas(conn, space_id, since_timestamp)?);

        // Sort by timestamp
        deltas.sort_by_key(|d| d.timestamp);

        Ok(deltas)
    }

    /// Apply incoming deltas
    pub fn apply_deltas(
        &self,
        conn: &Connection,
        deltas: Vec<SyncDelta>,
        dek: &[u8],
    ) -> Result<Vec<SyncConflict>, SyncError> {
        let mut conflicts = Vec::new();

        for delta in deltas {
            match self.apply_single_delta(conn, &delta, dek) {
                Ok(_) => {
                    // Log successful sync
                    self.log_entity_sync(conn, &delta)?;
                }
                Err(SyncError::ConflictError(_msg)) => {
                    // Detect and record conflict
                    if let Some(conflict) = self.detect_conflict(conn, &delta)? {
                        conflicts.push(conflict);
                    }
                }
                Err(e) => return Err(e),
            }
        }

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
                // Keep local version, discard remote
                self.mark_conflict_resolved(conn, &conflict.entity_id)?;
            }
            ConflictResolution::UseRemote => {
                // Apply remote version, overwrite local
                let delta = SyncDelta {
                    entity_type: conflict.entity_type.clone(),
                    entity_id: conflict.entity_id.clone(),
                    operation: SyncOperation::Update,
                    data: Some(conflict.remote_version.clone()),
                    timestamp: chrono::Utc::now().timestamp(),
                    vector_clock: HashMap::new(),
                };
                // Use provided DEK for encryption/decryption operations
                self.apply_single_delta(conn, &delta, dek)?;
                self.mark_conflict_resolved(conn, &conflict.entity_id)?;
            }
            ConflictResolution::Merge => {
                // Attempt automatic merge (implementation depends on entity type)
                // For now, just use local
                self.mark_conflict_resolved(conn, &conflict.entity_id)?;
            }
        }

        Ok(())
    }

    // Private helper methods

    fn get_last_sync_time(&self, conn: &Connection, space_id: Ulid) -> Result<i64, SyncError> {
        let result: Option<i64> = conn
            .query_row(
                "SELECT MAX(sync_time) FROM sync_history WHERE space_id = ?1",
                [space_id.to_string()],
                |row| row.get(0),
            )
            .optional()?;

        Ok(result.unwrap_or(0))
    }

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

        // Compute hashes for all entities in the space
        // This is a simplified version - real implementation would hash actual data

        // Notes
        let mut stmt = conn.prepare("SELECT id, updated_at FROM notes WHERE space_id = ?1")?;
        let note_rows = stmt.query_map([space_id.to_string()], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })?;

        for row in note_rows {
            let (id, updated_at) = row?;
            hashes.insert(format!("note:{}", id), format!("{}", updated_at));
        }

        Ok(hashes)
    }

    fn get_notes_deltas(
        &self,
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut deltas = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, encrypted_content, updated_at
             FROM notes
             WHERE space_id = ?1 AND updated_at > ?2",
        )?;

        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Vec<u8>>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })?;

        for row in rows {
            let (id, data, timestamp) = row?;
            deltas.push(SyncDelta {
                entity_type: "note".to_string(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(data),
                timestamp,
                vector_clock: HashMap::new(),
            });
        }

        Ok(deltas)
    }

    fn get_tasks_deltas(
        &self,
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut deltas = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, title, status, updated_at
             FROM tasks
             WHERE space_id = ?1 AND updated_at > ?2",
        )?;

        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
            ))
        })?;

        for row in rows {
            let (id, title, status, timestamp) = row?;
            let data = serde_json::json!({
                "title": title,
                "status": status,
            });
            deltas.push(SyncDelta {
                entity_type: "task".to_string(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(data.to_string().into_bytes()),
                timestamp,
                vector_clock: HashMap::new(),
            });
        }

        Ok(deltas)
    }

    fn get_projects_deltas(
        &self,
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut deltas = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, name, updated_at
             FROM projects
             WHERE space_id = ?1 AND updated_at > ?2",
        )?;

        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })?;

        for row in rows {
            let (id, name, timestamp) = row?;
            let data = serde_json::json!({ "name": name });
            deltas.push(SyncDelta {
                entity_type: "project".to_string(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(data.to_string().into_bytes()),
                timestamp,
                vector_clock: HashMap::new(),
            });
        }

        Ok(deltas)
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

    fn apply_note_delta(
        &self,
        conn: &Connection,
        delta: &SyncDelta,
        dek: &[u8],
    ) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    // Handle binary data without UTF-8 conversion to prevent data corruption
                    // Attempt to decrypt first; if it fails, assume plaintext and encrypt.
                    let encrypted_data: Vec<u8> = match crate::crypto::decrypt_bytes(data, dek)
                        .and_then(|plaintext| crate::crypto::encrypt_bytes(&plaintext, dek))
                    {
                        Ok(reenc) => reenc,
                        Err(_) => {
                            // Treat incoming as plaintext and encrypt with our DEK
                            crate::crypto::encrypt_bytes(data, dek)
                                .map_err(|e| SyncError::EncryptionError(e.to_string()))?
                        }
                    };

                    conn.execute(
                        "INSERT OR REPLACE INTO notes (id, encrypted_content, updated_at)
                         VALUES (?1, ?2, ?3)",
                        rusqlite::params![&delta.entity_id, encrypted_data, delta.timestamp],
                    )?;
                }
                SyncOperation::Delete => {
                    conn.execute("DELETE FROM notes WHERE id = ?1", [&delta.entity_id])?;
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
                    conn.execute(
                        "INSERT OR REPLACE INTO tasks (id, title, status, updated_at)
                         VALUES (?1, ?2, ?3, ?4)",
                        rusqlite::params![
                            &delta.entity_id,
                            task_data["title"].as_str().unwrap_or(""),
                            task_data["status"].as_str().unwrap_or("inbox"),
                            delta.timestamp
                        ],
                    )?;
                }
                SyncOperation::Delete => {
                    conn.execute("DELETE FROM tasks WHERE id = ?1", [&delta.entity_id])?;
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
                    conn.execute(
                        "INSERT OR REPLACE INTO projects (id, name, updated_at)
                         VALUES (?1, ?2, ?3)",
                        rusqlite::params![
                            &delta.entity_id,
                            project_data["name"].as_str().unwrap_or(""),
                            delta.timestamp
                        ],
                    )?;
                }
                SyncOperation::Delete => {
                    conn.execute("DELETE FROM projects WHERE id = ?1", [&delta.entity_id])?;
                }
            }
        }
        Ok(())
    }

    fn apply_health_metric_delta(
        &self,
        conn: &Connection,
        delta: &SyncDelta,
    ) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            let metric_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;

            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    conn.execute(
                        "INSERT OR REPLACE INTO health_metric (id, metric_type, value, unit, notes, recorded_at, created_at, updated_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                        rusqlite::params![
                            &delta.entity_id,
                            metric_data["metric_type"].as_str().unwrap_or(""),
                            metric_data["value"].as_f64().unwrap_or(0.0),
                            metric_data["unit"].as_str(),
                            metric_data["notes"].as_str(),
                            metric_data["recorded_at"].as_i64().unwrap_or(0),
                            metric_data["created_at"].as_i64().unwrap_or(0),
                            delta.timestamp
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
                    conn.execute(
                        "INSERT OR REPLACE INTO track (id, title, artist, album, updated_at)
                         VALUES (?1, ?2, ?3, ?4, ?5)",
                        rusqlite::params![
                            &delta.entity_id,
                            track_data["title"].as_str().unwrap_or(""),
                            track_data["artist"].as_str(),
                            track_data["album"].as_str(),
                            delta.timestamp
                        ],
                    )?;
                }
                SyncOperation::Delete => {
                    conn.execute("DELETE FROM track WHERE id = ?1", [&delta.entity_id])?;
                }
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
                    conn.execute(
                        "INSERT OR REPLACE INTO playlist (id, name, description, updated_at)
                         VALUES (?1, ?2, ?3, ?4)",
                        rusqlite::params![
                            &delta.entity_id,
                            playlist_data["name"].as_str().unwrap_or(""),
                            playlist_data["description"].as_str(),
                            delta.timestamp
                        ],
                    )?;
                }
                SyncOperation::Delete => {
                    conn.execute("DELETE FROM playlist WHERE id = ?1", [&delta.entity_id])?;
                }
            }
        }
        Ok(())
    }

    fn apply_calendar_event_delta(
        &self,
        conn: &Connection,
        delta: &SyncDelta,
    ) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            let event_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;

            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    conn.execute(
                        "INSERT OR REPLACE INTO calendar_event (id, title, description, start_time, end_time, updated_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                        rusqlite::params![
                            &delta.entity_id,
                            event_data["title"].as_str().unwrap_or(""),
                            event_data["description"].as_str(),
                            event_data["start_time"].as_i64().unwrap_or(0),
                            event_data["end_time"].as_i64(),
                            delta.timestamp
                        ],
                    )?;
                }
                SyncOperation::Delete => {
                    conn.execute("DELETE FROM calendar_event WHERE id = ?1", [&delta.entity_id])?;
                }
            }
        }
        Ok(())
    }

    fn detect_conflict(
        &self,
        conn: &Connection,
        delta: &SyncDelta,
    ) -> Result<Option<SyncConflict>, SyncError> {
        // Check if entity exists locally with newer timestamp and fetch actual data for conflict resolution
        let (local_timestamp, local_data): (Option<i64>, Option<Vec<u8>>) = match delta
            .entity_type
            .as_str()
        {
            "note" => {
                let ts: Option<i64> = conn
                    .query_row(
                        "SELECT updated_at FROM notes WHERE id = ?1",
                        [&delta.entity_id],
                        |row| row.get(0),
                    )
                    .optional()?;
                let data: Option<Vec<u8>> = conn
                    .query_row(
                        "SELECT encrypted_content FROM notes WHERE id = ?1",
                        [&delta.entity_id],
                        |row| row.get::<_, String>(0).map(|s| s.into_bytes()),
                    )
                    .optional()?;
                (ts, data)
            }
            "task" => {
                let ts: Option<i64> = conn
                    .query_row(
                        "SELECT updated_at FROM tasks WHERE id = ?1",
                        [&delta.entity_id],
                        |row| row.get(0),
                    )
                    .optional()?;
                // Serialize essential task fields for conflict payload
                let data: Option<Vec<u8>> = conn
                    .query_row(
                        "SELECT title, status, description, priority FROM tasks WHERE id = ?1",
                        [&delta.entity_id],
                        |row| {
                            let title: String = row.get(0)?;
                            let status: String = row.get(1)?;
                            let description: Option<String> = row.get::<_, Option<String>>(2)?;
                            let priority: Option<String> = row.get::<_, Option<String>>(3)?;
                            let json = serde_json::json!({
                                "title": title,
                                "status": status,
                                "description": description,
                                "priority": priority
                            });
                            Ok(json.to_string().into_bytes())
                        },
                    )
                    .optional()?;
                (ts, data)
            }
            "project" => {
                let ts: Option<i64> = conn
                    .query_row(
                        "SELECT updated_at FROM projects WHERE id = ?1",
                        [&delta.entity_id],
                        |row| row.get(0),
                    )
                    .optional()?;
                let data: Option<Vec<u8>> = conn
                    .query_row(
                        "SELECT name, description, status FROM projects WHERE id = ?1",
                        [&delta.entity_id],
                        |row| {
                            let name: String = row.get(0)?;
                            let description: Option<String> = row.get::<_, Option<String>>(1)?;
                            let status: String = row.get(2)?;
                            let json = serde_json::json!({
                                "name": name,
                                "description": description,
                                "status": status
                            });
                            Ok(json.to_string().into_bytes())
                        },
                    )
                    .optional()?;
                (ts, data)
            }
            _ => (None, None),
        };

        if let Some(local_ts) = local_timestamp {
            if local_ts > delta.timestamp {
                // Conflict: local version is newer - populate with actual local data for resolution
                return Ok(Some(SyncConflict {
                    entity_type: delta.entity_type.clone(),
                    entity_id: delta.entity_id.clone(),
                    local_version: local_data.unwrap_or_default(),
                    remote_version: delta.data.clone().unwrap_or_default(),
                    conflict_type: ConflictType::UpdateUpdate,
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

    /// Get sync history for a space
    pub fn get_sync_history(
        &self,
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

    fn get_health_metrics_deltas(
        &self,
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut deltas = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, note_id, metric_type, value, unit, notes, recorded_at, created_at, updated_at
             FROM health_metric
             WHERE space_id = ?1 AND updated_at > ?2",
        )?;

        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, f64>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, i64>(6)?,
                row.get::<_, i64>(7)?,
                row.get::<_, i64>(8)?,
            ))
        })?;

        for row in rows {
            let (
                id,
                note_id,
                metric_type,
                value,
                unit,
                notes,
                recorded_at,
                created_at,
                updated_at,
            ) = row?;
            let data = serde_json::json!({
                "note_id": note_id,
                "metric_type": metric_type,
                "value": value,
                "unit": unit,
                "notes": notes,
                "recorded_at": recorded_at,
                "created_at": created_at,
            });
            deltas.push(SyncDelta {
                entity_type: "health_metric".to_string(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(data.to_string().into_bytes()),
                timestamp: updated_at,
                vector_clock: HashMap::new(),
            });
        }

        Ok(deltas)
    }

    fn get_tracks_deltas(
        &self,
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut deltas = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, title, artist, album, updated_at
             FROM track
             WHERE space_id = ?1 AND updated_at > ?2",
        )?;

        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, i64>(4)?,
            ))
        })?;

        for row in rows {
            let (id, title, artist, album, updated_at) = row?;
            let data = serde_json::json!({
                "title": title,
                "artist": artist,
                "album": album,
            });
            deltas.push(SyncDelta {
                entity_type: "track".to_string(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(data.to_string().into_bytes()),
                timestamp: updated_at,
                vector_clock: HashMap::new(),
            });
        }

        Ok(deltas)
    }

    fn get_playlists_deltas(
        &self,
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut deltas = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, updated_at
             FROM playlist
             WHERE space_id = ?1 AND updated_at > ?2",
        )?;

        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, i64>(3)?,
            ))
        })?;

        for row in rows {
            let (id, name, description, updated_at) = row?;
            let data = serde_json::json!({
                "name": name,
                "description": description,
            });
            deltas.push(SyncDelta {
                entity_type: "playlist".to_string(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(data.to_string().into_bytes()),
                timestamp: updated_at,
                vector_clock: HashMap::new(),
            });
        }

        Ok(deltas)
    }

    fn get_calendar_events_deltas(
        &self,
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut deltas = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, title, description, start_time, end_time, updated_at
             FROM calendar_event
             WHERE space_id = ?1 AND updated_at > ?2",
        )?;

        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, Option<i64>>(4)?,
                row.get::<_, i64>(5)?,
            ))
        })?;

        for row in rows {
            let (id, title, description, start_time, end_time, updated_at) = row?;
            let data = serde_json::json!({
                "title": title,
                "description": description,
                "start_time": start_time,
                "end_time": end_time,
            });
            deltas.push(SyncDelta {
                entity_type: "calendar_event".to_string(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(data.to_string().into_bytes()),
                timestamp: updated_at,
                vector_clock: HashMap::new(),
            });
        }

        Ok(deltas)
    }

    /// Get unresolved conflicts
    pub fn get_unresolved_conflicts(
        &self,
        conn: &Connection,
    ) -> Result<Vec<SyncConflict>, SyncError> {
        let mut stmt = conn.prepare(
            "SELECT entity_type, entity_id, local_version, remote_version, conflict_type
             FROM sync_conflict
             WHERE resolved = 0
             ORDER BY detected_at DESC",
        )?;

        let conflicts = stmt
            .query_map([], |row| {
                let conflict_type_str: String = row.get(4)?;
                let conflict_type = match conflict_type_str.as_str() {
                    "UpdateUpdate" => ConflictType::UpdateUpdate,
                    "UpdateDelete" => ConflictType::UpdateDelete,
                    "DeleteUpdate" => ConflictType::DeleteUpdate,
                    _ => ConflictType::UpdateUpdate,
                };

                Ok(SyncConflict {
                    entity_type: row.get(0)?,
                    entity_id: row.get(1)?,
                    local_version: row.get(2)?,
                    remote_version: row.get(3)?,
                    conflict_type,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(conflicts)
    }

    /// Record sync history
    pub fn record_sync_history(
        &self,
        conn: &Connection,
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
                &self.device_id,
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncHistoryEntry {
    pub id: String,
    pub device_id: String,
    pub space_id: String,
    pub sync_time: i64,
    pub direction: String,
    pub entities_pushed: i32,
    pub entities_pulled: i32,
    pub conflicts_detected: i32,
    pub success: bool,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConflictResolution {
    UseLocal,
    UseRemote,
    Merge,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_agent_creation() {
        let agent = SyncAgent::new("device123".to_string(), "Test Device".to_string(), 8080);

        let info = agent.get_device_info();
        assert_eq!(info.device_id, "device123");
        assert_eq!(info.device_name, "Test Device");
        assert_eq!(info.sync_port, 8080);
    }

    #[test]
    fn test_device_type_serialization() {
        let device_type = DeviceType::Desktop;
        let serialized = serde_json::to_string(&device_type).expect("Failed to serialize");
        let deserialized: DeviceType = serde_json::from_str(&serialized).expect("Failed to deserialize");
        assert_eq!(device_type, deserialized);
    }

    #[test]
    fn test_sync_operation_types() {
        let ops = vec![
            SyncOperation::Create,
            SyncOperation::Update,
            SyncOperation::Delete,
        ];

        for op in ops {
            let serialized = serde_json::to_string(&op).expect("Failed to serialize");
            let deserialized: SyncOperation = serde_json::from_str(&serialized).expect("Failed to deserialize");
            assert_eq!(op, deserialized);
        }
    }
}
