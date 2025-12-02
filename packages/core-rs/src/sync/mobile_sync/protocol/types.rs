use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::IpAddr;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SyncProtocolError {
    #[error("Network error: {0}")]
    Network(String),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("Device not found")]
    DeviceNotFound,

    #[error("Sync version mismatch: expected {expected}, got {actual}")]
    VersionMismatch { expected: u32, actual: u32 },

    #[error("Invalid sync state: {0}")]
    InvalidState(String),

    #[error("Sync timeout")]
    Timeout,

    #[error("Authentication failed")]
    AuthenticationFailed,

    #[error("Device already exists")]
    DuplicateDevice,

    #[error("Discovery failed: {0}")]
    DiscoveryFailed(String),

    #[error("Key exchange failed")]
    KeyExchangeFailed,

    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

/// Protocol version for compatibility checking
/// Device type identifier
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum DeviceType {
    Desktop,
    Mobile,
    Tablet,
}

/// Sync state enum tracking synchronization progress
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SyncState {
    /// Not connected to any device
    Idle,
    /// Attempting to connect
    Connecting,
    /// Connected and ready
    Connected,
    /// Currently syncing
    Syncing,
    /// Sync completed successfully
    SyncComplete,
    /// Error occurred
    Error,
}

/// Device information for pairing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    /// Unique device identifier (UUID)
    pub device_id: String,

    /// Human-readable device name
    pub device_name: String,

    /// Device type (Desktop/Mobile/Tablet)
    pub device_type: DeviceType,

    /// IP address of device
    pub ip_address: IpAddr,

    /// Port for sync communication
    pub sync_port: u16,

    /// Public key for encryption
    pub public_key: Vec<u8>,

    /// Firmware/OS version
    pub os_version: String,

    /// Last seen timestamp
    pub last_seen: DateTime<Utc>,

    /// Is this device currently active
    pub is_active: bool,
}

/// Sync request sent from mobile to desktop
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncRequest {
    /// Protocol version for compatibility
    pub protocol_version: u32,

    /// Source device info
    pub source_device: DeviceInfo,

    /// Target device ID (optional, null = broadcast)
    pub target_device_id: Option<String>,

    /// Session ID for this sync
    pub session_id: String,

    /// Timestamp of request
    pub timestamp: DateTime<Utc>,

    /// Data categories to sync
    pub sync_categories: Vec<SyncCategory>,

    /// Last successful sync timestamp
    pub last_sync_timestamp: Option<DateTime<Utc>>,
}

/// Categories of data to synchronize
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SyncCategory {
    /// Social media accounts
    Accounts,
    /// Posts and content
    Posts,
    /// Categories and tags
    Categories,
    /// Focus modes
    FocusModes,
    /// Sync history
    SyncHistory,
    /// Backup metadata
    Backups,
    /// Noteece Vault Categories
    Notes,
    Tasks,
    Projects,
    Health,
    Time,
    Calendar,
}

/// Single delta (change) to sync
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncDelta {
    /// Type of change (Create, Update, Delete)
    pub operation: DeltaOperation,

    /// Entity type (post, account, category, etc.)
    pub entity_type: String,

    /// Entity ID
    pub entity_id: String,

    /// Encrypted data (BLOB). For Vault Sync, this may contain serialized JSON or raw content.
    pub encrypted_data: Option<Vec<u8>>,

    /// Timestamp of change
    pub timestamp: DateTime<Utc>,

    /// Hash of data for duplicate detection
    pub data_hash: Option<String>,

    /// Sequence number for ordering
    pub sequence: u64,

    /// Vector clock for causal ordering
    pub vector_clock: HashMap<String, i64>,
}

/// Operation type in sync delta
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum DeltaOperation {
    Create,
    Update,
    Delete,
}

/// Sync response from desktop to mobile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResponse {
    /// Protocol version
    pub protocol_version: u32,

    /// Source device info (server)
    pub source_device: DeviceInfo,

    /// Session ID matching request
    pub session_id: String,

    /// Status of sync
    pub status: SyncResponseStatus,

    /// Deltas to apply
    pub deltas: Vec<SyncDelta>,

    /// Total number of deltas
    pub total_deltas: u32,

    /// Current batch number
    pub batch_number: u32,

    /// Total batches
    pub total_batches: u32,

    /// Server timestamp
    pub timestamp: DateTime<Utc>,

    /// Compressed data size
    pub compressed_size: u64,

    /// Uncompressed data size
    pub uncompressed_size: u64,
}

/// Status of sync response
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SyncResponseStatus {
    /// Sync started
    Started,
    /// Sync in progress
    InProgress,
    /// Sync completed successfully
    Success,
    /// Sync completed with errors
    PartialSuccess,
    /// Sync failed
    Failed,
}

/// Device pairing request for initial setup
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairingRequest {
    /// Mobile device info
    pub mobile_device: DeviceInfo,

    /// Pairing code (6-digit PIN entered by user)
    pub pairing_code: String,

    /// Timestamp of pairing request
    pub timestamp: DateTime<Utc>,

    /// Client's public key for ECDH
    pub public_key: Vec<u8>,
}

/// Device pairing response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairingResponse {
    /// Desktop device info
    pub desktop_device: DeviceInfo,

    /// Was pairing successful
    pub success: bool,

    /// Error message if failed
    pub error_message: Option<String>,

    // SECURITY FIX: The shared_key is REMOVED from the response.
    // Instead, the desktop's public key is sent, allowing the client
    // to derive the shared secret without it ever being transmitted.
    pub public_key: Vec<u8>,

    /// Pairing timestamp
    pub timestamp: DateTime<Utc>,
}
