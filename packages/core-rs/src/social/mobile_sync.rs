/// Desktop-Mobile Sync Protocol for SocialHub
/// Enables synchronization of social media data between desktop and mobile devices
/// Uses encrypted protocol with local network discovery

use serde::{Deserialize, Serialize};
use std::net::{SocketAddr, IpAddr};
use std::sync::Arc;
use thiserror::Error;
use chrono::{DateTime, Utc};

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

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

/// Protocol version for compatibility checking
const SYNC_PROTOCOL_VERSION: u32 = 1;

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

    /// Encrypted data (BLOB)
    pub encrypted_data: Option<Vec<u8>>,

    /// Timestamp of change
    pub timestamp: DateTime<Utc>,

    /// Hash of data for duplicate detection
    pub data_hash: Option<String>,

    /// Sequence number for ordering
    pub sequence: u64,
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

    /// Shared encryption key
    pub shared_key: Option<Vec<u8>>,

    /// Pairing timestamp
    pub timestamp: DateTime<Utc>,
}

/// Sync protocol handler
pub struct SyncProtocol {
    /// This device's info
    device_info: Arc<DeviceInfo>,

    /// Paired devices
    paired_devices: Vec<DeviceInfo>,

    /// Current sync state
    sync_state: SyncState,

    /// Last sync timestamp
    last_sync: Option<DateTime<Utc>>,
}

impl SyncProtocol {
    /// Create new sync protocol handler
    pub fn new(device_info: DeviceInfo) -> Self {
        SyncProtocol {
            device_info: Arc::new(device_info),
            paired_devices: Vec::new(),
            sync_state: SyncState::Idle,
            last_sync: None,
        }
    }

    /// Discover other devices on local network using mDNS
    pub async fn discover_devices(&self) -> Result<Vec<DeviceInfo>, SyncProtocolError> {
        // TODO: Implement mDNS discovery
        // Use mdns-sd crate to discover _socialhub-sync._tcp.local services
        Ok(self.paired_devices.clone())
    }

    /// Pair with a desktop device
    pub async fn pair_device(
        &mut self,
        pairing_request: PairingRequest,
        expected_pairing_code: &str,
    ) -> Result<PairingResponse, SyncProtocolError> {
        // Validate pairing code against the one shown on desktop
        // Using constant-time comparison to prevent timing attacks
        if !Self::constant_time_compare(
            pairing_request.pairing_code.as_bytes(),
            expected_pairing_code.as_bytes(),
        ) {
            return Err(SyncProtocolError::AuthenticationFailed);
        }

        // Check for duplicate
        if self.paired_devices.iter().any(|d| d.device_id == pairing_request.mobile_device.device_id) {
            return Err(SyncProtocolError::DuplicateDevice);
        }

        // TODO: Implement actual key exchange using ECDH
        // For now, return success response
        let pairing_response = PairingResponse {
            desktop_device: (*self.device_info).clone(),
            success: true,
            error_message: None,
            shared_key: Some(vec![0u8; 32]), // Placeholder
            timestamp: Utc::now(),
        };

        // Add to paired devices
        self.paired_devices.push(pairing_request.mobile_device);

        Ok(pairing_response)
    }

    /// Start sync with paired device
    pub async fn start_sync(
        &mut self,
        device_id: &str,
        categories: Vec<SyncCategory>,
    ) -> Result<(), SyncProtocolError> {
        // Verify device is paired
        if !self.paired_devices.iter().any(|d| d.device_id == device_id) {
            return Err(SyncProtocolError::DeviceNotFound);
        }

        self.sync_state = SyncState::Connecting;

        // TODO: Establish encrypted connection
        // TODO: Create sync session
        // TODO: Begin delta transmission

        self.sync_state = SyncState::Syncing;

        Ok(())
    }

    /// Complete sync and update last_sync timestamp
    pub fn complete_sync(&mut self) -> Result<(), SyncProtocolError> {
        self.sync_state = SyncState::SyncComplete;
        self.last_sync = Some(Utc::now());
        Ok(())
    }

    /// Get current sync state
    pub fn get_sync_state(&self) -> SyncState {
        self.sync_state
    }

    /// Get list of paired devices
    pub fn get_paired_devices(&self) -> Vec<DeviceInfo> {
        self.paired_devices.clone()
    }

    /// Remove paired device
    pub fn remove_paired_device(&mut self, device_id: &str) -> Result<(), SyncProtocolError> {
        let initial_len = self.paired_devices.len();
        self.paired_devices.retain(|d| d.device_id != device_id);

        if self.paired_devices.len() == initial_len {
            return Err(SyncProtocolError::DeviceNotFound);
        }

        Ok(())
    }

    /// Get time since last successful sync
    pub fn get_last_sync_time(&self) -> Option<DateTime<Utc>> {
        self.last_sync
    }

    /// Check if device is paired and active
    pub fn is_device_available(&self, device_id: &str) -> bool {
        self.paired_devices
            .iter()
            .any(|d| d.device_id == device_id && d.is_active)
    }

    /// Constant-time comparison to prevent timing attacks
    /// Returns true only if both slices have equal length AND equal contents
    fn constant_time_compare(a: &[u8], b: &[u8]) -> bool {
        use subtle::ConstantTimeComparison;

        // First check lengths in constant time (if available)
        // If lengths differ, the comparison should fail without leaking info
        if a.len() != b.len() {
            return false;
        }

        // Compare contents in constant time
        a.ct_eq(b).into()
    }
}

/// Batch processor for efficient syncing
pub struct SyncBatchProcessor {
    /// Maximum items per batch
    pub batch_size: usize,

    /// Maximum bytes per batch
    pub max_batch_bytes: u64,
}

impl SyncBatchProcessor {
    /// Create new batch processor
    pub fn new(batch_size: usize, max_batch_bytes: u64) -> Self {
        SyncBatchProcessor {
            batch_size,
            max_batch_bytes,
        }
    }

    /// Split deltas into batches for transmission
    pub fn create_batches(&self, deltas: Vec<SyncDelta>) -> Vec<Vec<SyncDelta>> {
        let mut batches = Vec::new();
        let mut current_batch = Vec::new();
        let mut current_size = 0u64;

        for delta in deltas {
            let estimated_size = serde_json::to_vec(&delta)
                .map(|v| v.len() as u64)
                .unwrap_or(1024);

            if current_batch.len() >= self.batch_size
                || (current_size + estimated_size) > self.max_batch_bytes
            {
                if !current_batch.is_empty() {
                    batches.push(current_batch);
                    current_batch = Vec::new();
                    current_size = 0;
                }
            }

            current_batch.push(delta);
            current_size += estimated_size;
        }

        if !current_batch.is_empty() {
            batches.push(current_batch);
        }

        batches
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::IpAddr;

    fn create_test_device(name: &str) -> DeviceInfo {
        DeviceInfo {
            device_id: uuid::Uuid::new_v4().to_string(),
            device_name: name.to_string(),
            device_type: DeviceType::Mobile,
            ip_address: "192.168.1.100".parse::<IpAddr>().unwrap(),
            sync_port: 8766,
            public_key: vec![],
            os_version: "iOS 17.0".to_string(),
            last_seen: Utc::now(),
            is_active: true,
        }
    }

    #[test]
    fn test_sync_protocol_creation() {
        let device = create_test_device("TestPhone");
        let protocol = SyncProtocol::new(device);

        assert_eq!(protocol.get_sync_state(), SyncState::Idle);
        assert_eq!(protocol.get_paired_devices().len(), 0);
    }

    #[test]
    fn test_device_pairing() {
        let mut protocol = SyncProtocol::new(create_test_device("Desktop"));
        let mobile_device = create_test_device("Mobile");

        let pairing_request = PairingRequest {
            mobile_device: mobile_device.clone(),
            pairing_code: "123456".to_string(),
            timestamp: Utc::now(),
        };

        // This would normally be async
        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(protocol.pair_device(pairing_request, "123456"));

        assert!(result.is_ok());
        assert_eq!(protocol.get_paired_devices().len(), 1);
    }

    #[test]
    fn test_device_pairing_with_wrong_code() {
        let mut protocol = SyncProtocol::new(create_test_device("Desktop"));
        let mobile_device = create_test_device("Mobile");

        let pairing_request = PairingRequest {
            mobile_device: mobile_device.clone(),
            pairing_code: "999999".to_string(),
            timestamp: Utc::now(),
        };

        // This would normally be async
        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(protocol.pair_device(pairing_request, "123456")); // Different code

        assert!(result.is_err());
        assert_eq!(protocol.get_paired_devices().len(), 0);
    }

    #[test]
    fn test_batch_processor() {
        let processor = SyncBatchProcessor::new(2, 10000);

        let deltas = vec![
            SyncDelta {
                operation: DeltaOperation::Create,
                entity_type: "post".to_string(),
                entity_id: "1".to_string(),
                encrypted_data: Some(vec![0u8; 100]),
                timestamp: Utc::now(),
                data_hash: None,
                sequence: 1,
            },
            SyncDelta {
                operation: DeltaOperation::Update,
                entity_type: "post".to_string(),
                entity_id: "2".to_string(),
                encrypted_data: Some(vec![0u8; 100]),
                timestamp: Utc::now(),
                data_hash: None,
                sequence: 2,
            },
            SyncDelta {
                operation: DeltaOperation::Delete,
                entity_type: "post".to_string(),
                entity_id: "3".to_string(),
                encrypted_data: None,
                timestamp: Utc::now(),
                data_hash: None,
                sequence: 3,
            },
        ];

        let batches = processor.create_batches(deltas);
        assert_eq!(batches.len(), 2); // 2 items per batch
    }

    #[test]
    fn test_remove_paired_device() {
        let mut protocol = SyncProtocol::new(create_test_device("Desktop"));
        let device = create_test_device("Mobile");
        let device_id = device.device_id.clone();

        protocol.paired_devices.push(device);

        assert!(protocol.remove_paired_device(&device_id).is_ok());
        assert_eq!(protocol.get_paired_devices().len(), 0);
    }

    #[test]
    fn test_sync_state_transitions() {
        let mut protocol = SyncProtocol::new(create_test_device("Desktop"));

        assert_eq!(protocol.get_sync_state(), SyncState::Idle);

        protocol.sync_state = SyncState::Connecting;
        assert_eq!(protocol.get_sync_state(), SyncState::Connecting);

        protocol.sync_state = SyncState::Syncing;
        assert_eq!(protocol.get_sync_state(), SyncState::Syncing);

        let _ = protocol.complete_sync();
        assert_eq!(protocol.get_sync_state(), SyncState::SyncComplete);
    }
}
