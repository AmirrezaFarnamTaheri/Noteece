use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalDavAccount {
    pub id: String,
    pub url: String,
    pub username: String,
    #[serde(skip_serializing)]
    pub encrypted_password: String,
    pub calendar_path: String,
    pub sync_token: Option<String>,
    pub last_sync: Option<i64>,
    pub enabled: bool,
    pub auto_sync: bool,
    pub sync_frequency_minutes: i32,
    pub sync_direction: SyncDirection,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SyncDirection {
    Pull,
    Push,
    Bidirectional,
}

impl SyncDirection {
    pub fn as_str(&self) -> &'static str {
        match self {
            SyncDirection::Pull => "pull",
            SyncDirection::Push => "push",
            SyncDirection::Bidirectional => "bidirectional",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalDavEvent {
    pub uid: String,
    pub summary: String,
    pub description: Option<String>,
    pub start_time: i64,
    pub end_time: Option<i64>,
    pub location: Option<String>,
    pub status: String,
    pub last_modified: i64,
    pub etag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub account_id: String,
    pub sync_time: i64,
    pub direction: SyncDirection,
    pub events_pulled: u32,
    pub events_pushed: u32,
    pub conflicts: u32,
    pub errors: Vec<String>,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConflict {
    pub id: String,
    pub account_id: String,
    pub event_uid: String,
    pub local_version: String,
    pub remote_version: String,
    pub detected_at: i64,
    pub resolved: bool,
    pub resolution: Option<ConflictResolution>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConflictResolution {
    AcceptLocal,
    AcceptRemote,
    Merge,
}
