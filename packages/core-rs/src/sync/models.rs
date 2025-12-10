use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ulid::Ulid;

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
    pub space_id: Option<String>,
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
    pub conflict_type: crate::sync::conflict::ConflictType,
    pub space_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncTask {
    pub id: String,
    // Optional fields for broader compatibility
    pub device_id: Option<String>,
    pub space_id: Option<String>,
    pub direction: Option<String>,
    pub description: Option<String>,
    pub status: String,
    pub progress: f64,
    pub created_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SyncStats {
    pub total_synced: i32,
    pub last_sync_at: Option<i64>,
    pub success_rate: f64,
    pub conflicts_total: i32,
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
pub struct SyncProgress {
    pub device_id: String,
    pub phase: String,
    pub progress: f64,
    pub entities_pushed: i64,
    pub entities_pulled: i64,
    pub conflicts: i64,
    pub error_message: Option<String>,
}
